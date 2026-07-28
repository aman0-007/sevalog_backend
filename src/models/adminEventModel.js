const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require('../config/db');

const AdminEventModel = {

    /**
     * Create an event along with standard metadata tracking structures
     */
    createEvent: async (eventData, adminId) => {
        const {
            title,
            description,
            category,
            event_date,
            start_time,
            end_time,
            location_name,
            location_address,
            google_maps_link,
            contact_person_name,
            contact_person_phone,
            volunteers_needed,
            min_volunteers,
            max_volunteers,
            registration_deadline
        } = eventData;

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const insertQuery = `
                INSERT INTO events (
                    title,
                    description,
                    category,
                    event_date,
                    start_time,
                    end_time,
                    location_name,
                    location_address,
                    google_maps_link,
                    contact_person_name,
                    contact_person_phone,
                    volunteers_needed,
                    min_volunteers,
                    max_volunteers,
                    registration_deadline,
                    created_by
                )
                VALUES (
                    $1,$2,$3,$4,$5,$6,
                    $7,$8,$9,$10,$11,
                    $12,$13,$14,$15,$16
                )
                RETURNING *;
            `;

            const values = [
                title?.trim(),
                description?.trim() || null,
                category?.trim() || null,
                event_date,
                start_time,
                end_time,
                location_name?.trim(),
                location_address?.trim(),
                google_maps_link?.trim() || null,
                contact_person_name?.trim() || null,
                contact_person_phone?.trim() || null,
                volunteers_needed,
                min_volunteers,
                max_volunteers,
                registration_deadline,
                adminId
            ];

            const { rows } = await client.query(insertQuery, values);
            await client.query(
                `
                INSERT INTO event_timeline
                (event_id,user_id,action)
                VALUES ($1,$2,$3)
                `,
                [
                    rows[0].event_id,
                    adminId,
                    'Event created as Draft'
                ]
            );

            await client.query("COMMIT");

            return rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Publish a Draft Event
     */
    publishEvent: async (eventId, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            // Lock the row
            const eventResult = await client.query(
                `
                SELECT *
                FROM events
                WHERE event_id = $1
                AND is_deleted = FALSE
                FOR UPDATE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                throw new Error("EVENT_NOT_FOUND");
            }
            const event = eventResult.rows[0];
            if (event.status !== "draft") {
                throw new Error("INVALID_EVENT_STATUS");
            }
            // Update status
            const updateResult = await client.query(
                `
                UPDATE events
                SET
                    status='published',
                    updated_at=CURRENT_TIMESTAMP
                WHERE event_id=$1
                RETURNING *;
                `,
                [eventId]
            );
            // Timeline
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    adminId,
                    "Event Published"
                ]
            );
            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    /**
     * Complete a Published Event
     */
    completeEvent: async (eventId, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            // Lock event
            const eventResult = await client.query(
                `
                SELECT *
                FROM events
                WHERE event_id = $1
                AND is_deleted = FALSE
                FOR UPDATE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                throw new Error("EVENT_NOT_FOUND");
            }
            const event = eventResult.rows[0];
            if (event.status !== "published") {
                throw new Error("INVALID_EVENT_STATUS");
            }
            const now = new Date();
            const eventEnd = new Date(
                `${event.event_date.toISOString().split('T')[0]}T${event.end_time}`
            );
            if (now < eventEnd) {
                throw new Error("EVENT_NOT_FINISHED");
            }
            // Volunteers who never checked in are absent
            await client.query(
                `
                UPDATE attendance
                SET status = 'absent'
                WHERE event_id = $1
                AND status = 'registered'
                `,
                [eventId]
            );
            // Complete event
            const updateResult = await client.query(
                `
                UPDATE events
                SET
                    status = 'completed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE event_id = $1
                RETURNING *;
                `,
                [eventId]
            );
            // Timeline
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    adminId,
                    'Event Completed'
                ]
            );
            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Cancel an Event
     */
    cancelEvent: async (eventId, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            // Lock event row
            const eventResult = await client.query(
                `
                SELECT *
                FROM events
                WHERE event_id = $1
                AND is_deleted = FALSE
                FOR UPDATE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                throw new Error("EVENT_NOT_FOUND");
            }
            const event = eventResult.rows[0];
            // Allowed only for Draft and Published events
            if (!["draft", "published"].includes(event.status)) {
                throw new Error("INVALID_EVENT_STATUS");
            }
            // Mark all registered/absent volunteers as withdrawn
            await client.query(
                `
                UPDATE attendance
                SET status = 'withdrawn'
                WHERE event_id = $1
                AND status IN ('registered', 'absent');
                `,
                [eventId]
            );
            // Cancel Event
            const updateResult = await client.query(
                `
                UPDATE events
                SET
                    status = 'cancelled',
                    updated_at = CURRENT_TIMESTAMP
                WHERE event_id = $1
                RETURNING *;
                `,
                [eventId]
            );
            // Timeline
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    adminId,
                    'Event Cancelled'
                ]
            );
            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Archive a Completed or Cancelled Event
     */
    archiveEvent: async (eventId, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            // Lock event row
            const eventResult = await client.query(
                `
                SELECT *
                FROM events
                WHERE event_id = $1
                AND is_deleted = FALSE
                FOR UPDATE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                throw new Error("EVENT_NOT_FOUND");
            }
            const event = eventResult.rows[0];
            // Only Completed or Cancelled events can be archived
            if (!["completed", "cancelled"].includes(event.status)) {
                throw new Error("INVALID_EVENT_STATUS");
            }
            const updateResult = await client.query(
                `
                UPDATE events
                SET
                    status = 'archived',
                    updated_at = CURRENT_TIMESTAMP
                WHERE event_id = $1
                RETURNING *;
                `,
                [eventId]
            );
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    adminId,
                    'Event Archived'
                ]
            );
            await client.query("COMMIT");
            return updateResult.rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Generate Attendance QR code
     */
    generateQRCode: async (eventId, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const eventResult = await client.query(
                `
                SELECT
                    event_id,
                    status,
                    event_date,
                    start_time,
                    end_time
                FROM events
                WHERE event_id = $1
                AND is_deleted = FALSE
                FOR UPDATE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                throw new Error("Event not found.");
            }
            const event = eventResult.rows[0];
            if (event.status !== "published") {
                throw new Error(
                    "QR code can only be generated for published events."
                );
            }
            const now = new Date();
            const eventStart = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.start_time}`
            );
            const eventEnd = new Date(
                `${event.event_date.toISOString().split("T")[0]}T${event.end_time}`
            );
            const allowedStart = new Date(
                eventStart.getTime() - (30 * 60 * 1000)
            );
            if (now < allowedStart) {
                const mins = Math.ceil(
                    (allowedStart - now) / 60000
                );
                throw new Error(
                    `Check-in opens 30 minutes before the event. Please wait ${mins} minute(s).`
                );

            }
            if (now > eventEnd) {
                throw new Error(
                    "Event has already ended."
                );
            }
            const token = jwt.sign(
                {
                    eventId,
                    nonce: crypto.randomUUID()
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30s"
                }
            );
            const expiry = new Date(
                Date.now() + 30000
            );
            await client.query(
                `
                UPDATE events
                SET
                    qr_code_token = $1,
                    qr_expiry = $2
                WHERE event_id = $3
                `,
                [
                    token,
                    expiry,
                    eventId
                ]
            );
            await client.query(
                `
                INSERT INTO event_timeline
                (
                    event_id,
                    user_id,
                    action
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    eventId,
                    adminId,
                    'Attendance QR Generated'
                ]
            );
            await client.query("COMMIT");
            return {
                token,
                expiresAt: expiry,
                refreshIntervalMs: 25000
            };
        }
        catch(error){
            await client.query("ROLLBACK");
            throw error;
        }
        finally{
            client.release();
        }
    },

    

    /**
     * Get aggregated analytics counts from cached dashboard stats
     */
    getMetrics: async () => {
        const queryText = `SELECT
            (SELECT COUNT(*) FROM events WHERE is_deleted = FALSE) AS total_events,
            (SELECT COUNT(*) FROM events
                WHERE status='upcoming' AND is_deleted=FALSE) AS upcoming_events,
            (SELECT COUNT(*) FROM events
                WHERE status='ongoing' AND is_deleted=FALSE) AS ongoing_events,
            (SELECT COUNT(*) FROM events
                WHERE status='completed' AND is_deleted=FALSE) AS completed_events,
            (SELECT COUNT(*) FROM users
                WHERE role='volunteer' AND is_active=TRUE) AS total_volunteers,
            (
                SELECT COALESCE(SUM(hours_logged),0)
                FROM attendance
                WHERE status='present'
            ) AS total_hours_logged;`;

        
        const { rows } = await db.query(queryText);
        if (rows.length === 0) {
            // Fallback object matching dashboard card design
            return {
                total_events: 0, upcoming_events: 0, ongoing_events: 0,
                completed_events: 0, total_volunteers: 0,
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
                -- FIX: Removed registration_closed from the trap. Let the clock dictate the lifecycle.
                CASE 
                    WHEN e.status IN ('cancelled', 'archived', 'draft') THEN e.status::text
                    WHEN CURRENT_DATE < e.event_date THEN 'upcoming'
                    WHEN CURRENT_DATE = e.event_date AND CURRENT_TIME BETWEEN e.start_time AND e.end_time THEN 'ongoing'
                    WHEN CURRENT_DATE > e.event_date OR (CURRENT_DATE = e.event_date AND CURRENT_TIME > e.end_time) THEN 'completed'
                    ELSE e.status::text
                END AS dynamic_status
            FROM events e
            LEFT JOIN (
                SELECT 
                    event_id,
                    COUNT(*) FILTER (WHERE status IN ('registered', 'present')) AS reg_count
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
     * Deep-fetch an complete event layout with cross-table elements
     */
    getEventDetails: async (eventId) => {
        const eventQuery = `
            SELECT e.*, 
                   u.first_name AS creator_first, u.last_name AS creator_last,
                   CASE 
                       WHEN e.status IN ('cancelled', 'archived', 'draft') THEN e.status::text
                       WHEN CURRENT_DATE < e.event_date THEN 'upcoming'
                       WHEN CURRENT_DATE = e.event_date AND CURRENT_TIME BETWEEN e.start_time AND e.end_time THEN 'ongoing'
                       WHEN CURRENT_DATE > e.event_date OR (CURRENT_DATE = e.event_date AND CURRENT_TIME > e.end_time) THEN 'completed'
                       ELSE e.status::text
                   END AS dynamic_status
            FROM events e
            LEFT JOIN users u ON e.created_by = u.user_id
            WHERE e.event_id = $1 AND e.is_deleted = FALSE;
        `;
        const { rows } = await db.query(eventQuery, [eventId]);
        if (rows.length === 0) return null;

        const event = rows[0];

        // Parallel processing of related components to ensure performance under load
        const [volunteers, timeline] = await Promise.all([
            db.query(`
                SELECT a.attendance_id, a.status, a.check_in_time, a.check_out_time, a.hours_logged, a.admin_remarks, a.created_at AS registered_at,
                       u.user_id, u.first_name, u.last_name, u.email, u.phone_number
                FROM attendance a
                JOIN users u ON a.volunteer_id = u.user_id
                WHERE a.event_id = $1
                ORDER BY a.created_at ASC
            `, [eventId]),
            db.query(`SELECT t.*, u.first_name, u.last_name FROM event_timeline t LEFT JOIN users u ON t.user_id = u.user_id WHERE t.event_id = $1 ORDER BY t.timestamp DESC`, [eventId]),
        ]);

        event.roster = volunteers.rows;
        event.timeline = timeline.rows;

        return event;
    },

    /**
     * Complete lifecycle state update wrapper
     */
    updateEvent: async (eventId, updates, adminId) => {
        const eventResult = await db.query(
            `
            SELECT status
            FROM events
            WHERE event_id = $1
            AND is_deleted = FALSE
            `,
            [eventId]
        );

        if (eventResult.rows.length === 0) {
            throw new Error("EVENT_NOT_FOUND");
        }

        // Archived events cannot be edited
        if (eventResult.rows[0].status === "archived") {
            throw new Error("EVENT_ARCHIVED");
        }

        const fields = Object.keys(updates);
        if (fields.length === 0) return null;

        const setClause = fields.map((field, idx) => `"${field}" = $${idx + 2}`).join(', ');
        const values = [eventId, ...Object.values(updates)];

        const updateResult = await db.query(
            `
            UPDATE events
            SET
                ${setClause},
                updated_at = CURRENT_TIMESTAMP
            WHERE event_id = $1
            RETURNING *;
            `,
            values
        );

        await db.query(
            `
            INSERT INTO event_timeline
            (
                event_id,
                user_id,
                action
            )
            VALUES
            (
                $1,
                $2,
                $3
            )
            `,
            [
                eventId,
                adminId,
                `Fields updated: ${fields.join(", ")}`
            ]
        );

        return updateResult.rows[0];
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