const db = require('../config/db'); // Your database connection pool

const AdminEventModel = {
    /**
     * Get aggregated analytics counts from cached dashboard stats
     */
    getMetrics: async () => {
        const queryText = `SELECT * FROM admin_dashboard_cache WHERE id = 1;`;
        const { rows } = await db.query(queryText);
        if (rows.length === 0) {
            // Fallback object matching dashboard card design
            return {
                total_events: 0, upcoming_events: 0, ongoing_events: 0,
                completed_events: 0, total_volunteers: 0, active_volunteers: 0,
                total_hours_logged: 0.00
            };
        }
        return rows[0];
    },

    /**
     * Advanced Event Listing with full query parameters, filtering, sorting and pagination
     */
    getAllEvents: async (filters = {}) => {
        const { search, location, category, status, sortBy, sortOrder = 'DESC', limit = 10, offset = 0 } = filters;
        
        let queryParams = [];
        let whereClauses = ['e.is_deleted = FALSE'];

        // Dynamic Text Search Matrix
        if (search) {
            queryParams.push(`%${search}%`);
            whereClauses.push(`e.title ILIKE $${queryParams.length}`);
        }
        if (location) {
            queryParams.push(`%${location}%`);
            whereClauses.push(`(e.location_name ILIKE $${queryParams.length} OR e.location_address ILIKE $${queryParams.length})`);
        }
        if (category) {
            queryParams.push(category);
            whereClauses.push(`e.category = $${queryParams.length}`);
        }
        if (status) {
            queryParams.push(status);
            whereClauses.push(`e.status = $${queryParams.length}`);
        }

        // Build Sort Strategies
        let orderClause = 'ORDER BY e.created_at DESC';
        if (sortBy === 'date') orderClause = `ORDER BY e.event_date ${sortOrder}, e.start_time ${sortOrder}`;
        if (sortBy === 'created') orderClause = `ORDER BY e.created_at ${sortOrder}`;
        if (sortBy === 'volunteers') orderClause = `ORDER BY volunteers_registered ${sortOrder}`;
        if (sortBy === 'status') orderClause = `ORDER BY e.status ${sortOrder}`;

        const baseQuery = `
            SELECT 
                e.*,
                COALESCE(att.reg_count, 0)::integer AS volunteers_registered,
                COALESCE(att.wait_count, 0)::integer AS volunteers_waitlisted,
                -- Return real-time runtime calculated lifecycle if override isn't forcing static values
                CASE 
                    WHEN e.status IN ('cancelled', 'archived', 'draft', 'registration_closed') THEN e.status::text
                    WHEN CURRENT_DATE < e.event_date THEN 'upcoming'
                    WHEN CURRENT_DATE = e.event_date AND CURRENT_TIME BETWEEN e.start_time AND e.end_time THEN 'ongoing'
                    WHEN CURRENT_DATE > e.event_date OR (CURRENT_DATE = e.event_date AND CURRENT_TIME > e.end_time) THEN 'completed'
                    ELSE e.status::text
                END AS dynamic_status
            FROM events e
            LEFT JOIN (
                SELECT 
                    event_id,
                    COUNT(*) FILTER (WHERE status IN ('registered', 'present')) AS reg_count,
                    COUNT(*) FILTER (WHERE status = 'waitlisted') AS wait_count
                FROM attendance
                GROUP BY event_id
            ) att ON e.event_id = att.event_id
            WHERE ${whereClauses.join(' AND ')}
            ${orderClause}
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `;

        queryParams.push(parseInt(limit));
        queryParams.push(parseInt(offset));

        const { rows } = await db.query(baseQuery, queryParams);
        return rows;
    },

    /**
     * Create an event along with standard metadata tracking structures
     */
    createEvent: async (eventData, adminId) => {
        const {
            title, description, category, event_date, start_time, end_time,
            location_name, location_address, google_maps_link, contact_person_name,
            contact_person_phone, volunteers_needed, min_volunteers, max_volunteers,
            waitlist_enabled, auto_close_registration, banner_image_url, event_color,
            priority, visibility, registration_deadline
        } = eventData;

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const insertText = `
                INSERT INTO events (
                    title, description, category, event_date, start_time, end_time,
                    location_name, location_address, google_maps_link, contact_person_name,
                    contact_person_phone, volunteers_needed, min_volunteers, max_volunteers,
                    waitlist_enabled, auto_close_registration, banner_image_url, event_color,
                    priority, visibility, registration_deadline, created_by, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'draft')
                RETURNING *;
            `;

            const values = [
                title, description, category, event_date, start_time, end_time,
                location_name, location_address, google_maps_link, contact_person_name,
                contact_person_phone, volunteers_needed, min_volunteers, max_volunteers || volunteers_needed,
                waitlist_enabled || false, auto_close_registration || true, banner_image_url, event_color || '#3B82F6',
                priority || 'medium', visibility || 'public', registration_deadline, adminId
            ];

            const res = await client.query(insertText, values);
            const createdEvent = res.rows[0];

            // Auto-log initial operational state change inside event history tracking system
            await client.query(
                `INSERT INTO event_timeline (event_id, user_id, action) VALUES ($1, $2, $3)`,
                [createdEvent.event_id, adminId, 'Event created in Draft mode']
            );

            await client.query('COMMIT');
            return createdEvent;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Deep-fetch an complete event layout with cross-table elements
     */
    getEventDetails: async (eventId) => {
        const eventQuery = `
            SELECT e.*, 
                   u.first_name AS creator_first, u.last_name AS creator_last
            FROM events e
            LEFT JOIN users u ON e.created_by = u.user_id
            WHERE e.event_id = $1 AND e.is_deleted = FALSE;
        `;
        const { rows } = await db.query(eventQuery, [eventId]);
        if (rows.length === 0) return null;

        const event = rows[0];

        // Parallel processing of related components to ensure performance under load
        const [volunteers, timeline, notes] = await Promise.all([
            db.query(`
                SELECT a.attendance_id, a.status, a.attendance_method, a.check_in_time, a.check_out_time, a.hours_logged, a.admin_remarks, a.created_at AS registered_at,
                       u.user_id, u.first_name, u.last_name, u.email, u.phone_number
                FROM attendance a
                JOIN users u ON a.volunteer_id = u.user_id
                WHERE a.event_id = $1
                ORDER BY a.created_at ASC
            `, [eventId]),
            db.query(`SELECT t.*, u.first_name, u.last_name FROM event_timeline t LEFT JOIN users u ON t.user_id = u.user_id WHERE t.event_id = $1 ORDER BY t.timestamp DESC`, [eventId]),
            db.query(`SELECT n.*, u.first_name, u.last_name FROM event_notes n JOIN users u ON n.admin_id = u.user_id WHERE n.event_id = $1 ORDER BY n.created_at DESC`, [eventId])
        ]);

        event.roster = volunteers.rows;
        event.timeline = timeline.rows;
        event.internal_notes = notes.rows;

        return event;
    },

    /**
     * Complete lifecycle state update wrapper
     */
    updateEvent: async (eventId, updates, adminId) => {
        const fields = Object.keys(updates);
        if (fields.length === 0) return null;

        const setClause = fields.map((field, idx) => `"${field}" = $${idx + 2}`).join(', ');
        const queryText = `
            UPDATE events 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE event_id = $1 AND is_deleted = FALSE 
            RETURNING *;
        `;

        const values = [eventId, ...Object.values(updates)];
        const { rows } = await db.query(queryText, values);

        if (rows.length > 0) {
            await db.query(
                `INSERT INTO event_timeline (event_id, user_id, action) VALUES ($1, $2, $3)`,
                [eventId, adminId, `Fields updated: ${fields.join(', ')}`]
            );
        }
        return rows[0];
    },

    /**
     * Updates individual volunteer registration states directly inside management layouts
     */
    updateAttendanceStatus: async (attendanceId, status, adminId, additionalFields = {}) => {
        const { hours_logged, admin_remarks, check_in_time, check_out_time } = additionalFields;

        const queryText = `
            UPDATE attendance
            SET status = $1, 
                marked_by = $2,
                hours_logged = COALESCE($3, hours_logged),
                admin_remarks = COALESCE($4, admin_remarks),
                check_in_time = COALESCE($5, check_in_time),
                check_out_time = COALESCE($6, check_out_time)
            WHERE attendance_id = $7
            RETURNING *;
        `;
        const values = [status, adminId, hours_logged, admin_remarks, check_in_time, check_out_time, attendanceId];
        const { rows } = await db.query(queryText, values);
        return rows[0];
    },

    /**
     * Soft-delete an event (sets is_deleted flag and tracks who deleted it)
     */
    deleteEvent: async (eventId, adminId) => {
        const queryText = `
            UPDATE events 
            SET is_deleted = TRUE, 
                deleted_at = CURRENT_TIMESTAMP, 
                deleted_by = $2,
                status = 'cancelled'
            WHERE event_id = $1 AND is_deleted = FALSE 
            RETURNING *;
        `;
        const { rows } = await db.query(queryText, [eventId, adminId]);
        
        if (rows.length > 0) {
            await db.query(
                `INSERT INTO event_timeline (event_id, user_id, action) VALUES ($1, $2, $3)`,
                [eventId, adminId, 'Event soft-deleted by system administrator']
            );
        }
        return rows[0];
    }
};

module.exports = AdminEventModel;