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
                    registration_open=TRUE,
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
     * Update an existing event's details
     */
    updateEvent: async (eventId, updateFields, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            // 1. Lock the event
            const eventResult = await client.query(
                `SELECT status FROM events WHERE event_id = $1 AND is_deleted = FALSE FOR UPDATE`,
                [eventId]
            );

            if (eventResult.rows.length === 0) throw new Error("EVENT_NOT_FOUND");
            if (["completed", "cancelled", "archived"].includes(eventResult.rows[0].status)) {
                throw new Error("INVALID_EVENT_STATUS");
            }

            // 2. Build dynamic update query to only touch provided fields
            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updateFields)) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }

            if (setClauses.length === 0) throw new Error("NO_DATA_PROVIDED");

            values.push(eventId); // For the WHERE clause
            
            const updateQuery = `
                UPDATE events 
                SET ${setClauses.join(", ")} 
                WHERE event_id = $${paramIndex} 
                RETURNING *;
            `;

            const { rows } = await client.query(updateQuery, values);

            // 3. Log the change
            await client.query(
                `INSERT INTO event_timeline (event_id, user_id, action) VALUES ($1, $2, $3)`,
                [eventId, adminId, 'Event details manually updated by admin']
            );

            await client.query("COMMIT");
            return rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
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
     * Soft-delete an Event
     */
    deleteEvent: async (eventId, adminId) => {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Mark event as deleted and cancelled
            const queryText = `
                UPDATE events 
                SET is_deleted = TRUE, 
                    deleted_at = CURRENT_TIMESTAMP, 
                    deleted_by = $2,
                    status = 'cancelled'
                WHERE event_id = $1 AND is_deleted = FALSE 
                RETURNING *;
            `;
            const { rows } = await client.query(queryText, [eventId, adminId]);
            
            if (rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            // 2. Withdraw any active volunteers (maintains data consistency)
            await client.query(
                `UPDATE attendance 
                 SET status = 'withdrawn' 
                 WHERE event_id = $1 AND status IN ('registered', 'absent')`,
                [eventId]
            );

            // 3. Log into timeline
            await client.query(
                `INSERT INTO event_timeline (event_id, user_id, action) VALUES ($1, $2, $3)`,
                [eventId, adminId, 'Event soft-deleted by system administrator']
            );

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Generate Attendance QR code
     */
    generateQRCode: async (eventId, adminId, type) => {
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
            if (type === "checkin") {
                const allowedStart =
                    new Date(
                        eventStart.getTime() -
                        (30 * 60 * 1000)
                    );
                if (now < allowedStart) {
                    const mins = Math.ceil(
                        (allowedStart - now) / 60000
                    );
                    throw new Error(
                        `Check-in opens 30 minutes before the event. Please wait ${mins} minute(s).`
                    );
                }
            }
            else {
                if (now < eventStart) {
                    throw new Error(
                        "Checkout is not available before the event starts."
                    );
                }
            }
            if (now > eventEnd) {
                throw new Error(
                    "Event has already ended."
                );
            }
            const token = jwt.sign(
                {
                    eventId,
                    action: type,
                    nonce: crypto.randomUUID()
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30s"
                }
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
                    `${type === "checkin"
                        ? "Check-in"
                        : "Checkout"} QR Generated`
                ]
            );
            await client.query("COMMIT");
            return {
                type,
                token,
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
     * Manually update a volunteer's attendance record (Trigger-safe)
     */
    updateManualAttendance: async (eventId, volunteerId, data, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            // 1. Build the dynamic update query to avoid accidentally firing triggers
            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            // Only add fields to the SET clause if they were explicitly provided
            if (data.status !== undefined) {
                setClauses.push(`status = $${paramIndex++}`);
                values.push(data.status);
            }
            if (data.check_in_time !== undefined) {
                setClauses.push(`check_in_time = $${paramIndex++}`);
                values.push(data.check_in_time);
            }
            if (data.check_out_time !== undefined) {
                setClauses.push(`check_out_time = $${paramIndex++}`);
                values.push(data.check_out_time);
            }
            if (data.hours_logged !== undefined) {
                setClauses.push(`hours_logged = $${paramIndex++}`);
                values.push(data.hours_logged);
            }
            if (data.admin_remarks !== undefined) {
                setClauses.push(`admin_remarks = $${paramIndex++}`);
                values.push(data.admin_remarks);
            }

            // Always update who marked it
            setClauses.push(`marked_by = $${paramIndex++}`);
            values.push(adminId);

            if (setClauses.length === 1) throw new Error("NO_DATA_PROVIDED"); // Only marked_by was added

            // Add WHERE parameters
            values.push(eventId);
            values.push(volunteerId);
            
            const queryText = `
                UPDATE attendance 
                SET ${setClauses.join(", ")} 
                WHERE event_id = $${paramIndex} AND volunteer_id = $${paramIndex + 1}
                RETURNING *;
            `;

            const { rows } = await client.query(queryText, values);

            if (rows.length === 0) throw new Error("ATTENDANCE_RECORD_NOT_FOUND");

            // 2. Log the manual intervention
            await client.query(
                `INSERT INTO event_timeline (event_id, user_id, action) VALUES ($1, $2, $3)`,
                [eventId, adminId, `Admin manually updated attendance for volunteer ${volunteerId}`]
            );

            await client.query("COMMIT");
            return rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Event Listing with full query parameters, filtering, sorting and pagination
     */
    getAllEvents: async (filters = {}) => {
        const { search, location, category, status, sortBy, sortOrder = 'DESC', limit = 50, offset = 0 } = filters;
        
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

        // Sanitize Sort Order to prevent SQL injection via template literals
        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Build Sort Strategies
        let orderClause = `ORDER BY e.created_at ${safeSortOrder}`;
        if (sortBy === 'date') orderClause = `ORDER BY e.event_date ${safeSortOrder}, e.start_time ${safeSortOrder}`;
        if (sortBy === 'volunteers') orderClause = `ORDER BY volunteers_registered ${safeSortOrder}`;
        if (sortBy === 'status') orderClause = `ORDER BY dynamic_status ${safeSortOrder}`;

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Optimization: 
        // 1. COUNT(*) OVER() gives us total records for pagination without a second query.
        // 2. (SELECT COUNT...) as a correlated subquery is faster than a massive LEFT JOIN when using LIMIT/OFFSET.
        const baseQuery = `
            SELECT 
                e.*,
                (
                    SELECT COUNT(*) 
                    FROM attendance a 
                    WHERE a.event_id = e.event_id AND a.status IN ('registered', 'present')
                )::integer AS volunteers_registered,
                COUNT(*) OVER()::integer AS full_count,
                CASE 
                    WHEN e.status IN ('cancelled', 'archived', 'draft') THEN e.status::text
                    WHEN CURRENT_DATE < e.event_date THEN 'upcoming'
                    WHEN CURRENT_DATE = e.event_date AND CURRENT_TIME BETWEEN e.start_time AND e.end_time THEN 'ongoing'
                    WHEN CURRENT_DATE > e.event_date OR (CURRENT_DATE = e.event_date AND CURRENT_TIME > e.end_time) THEN 'completed'
                    ELSE e.status::text
                END AS dynamic_status
            FROM events e
            ${whereString}
            ${orderClause}
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `;

        queryParams.push(parseInt(limit, 10));
        queryParams.push(parseInt(offset, 10));

        const { rows } = await db.query(baseQuery, queryParams);
        
        // Extract total count for pagination metadata (from the first row's window function result)
        const totalCount = rows.length > 0 ? rows[0].full_count : 0;
        
        // Remove full_count from individual row objects before returning
        const cleanedRows = rows.map(({ full_count, ...rest }) => rest);

        return { data: cleanedRows, totalCount };
    },

    /**
     * Deep-fetch a complete event layout with cross-table elements
     */
    getEventDetails: async (eventId) => {
        // 1. Fetch core event data and creator info
        const eventQuery = `
            SELECT 
                e.*, 
                u.first_name AS creator_first, 
                u.last_name AS creator_last,
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
        
        // If event doesn't exist or is deleted, short-circuit and return null
        if (rows.length === 0) return null;

        const event = rows[0];

        // 2. Parallel processing of related components to minimize latency
        const [volunteersResult, timelineResult] = await Promise.all([
            // Fetch the volunteer roster (Explicit column selection for memory efficiency)
            db.query(`
                SELECT 
                    a.attendance_id, a.status AS attendance_status, 
                    a.check_in_time, a.check_out_time, 
                    a.hours_logged, a.admin_remarks, 
                    a.created_at AS registered_at,
                    u.user_id, u.first_name, u.last_name, u.email, u.phone_number
                FROM attendance a
                JOIN users u ON a.volunteer_id = u.user_id
                WHERE a.event_id = $1
                ORDER BY a.created_at ASC
            `, [eventId]),
            
            // Fetch the event timeline logs
            db.query(`
                SELECT 
                    t.log_id, t.action, t.timestamp,
                    u.user_id, u.first_name, u.last_name
                FROM event_timeline t 
                LEFT JOIN users u ON t.user_id = u.user_id 
                WHERE t.event_id = $1 
                ORDER BY t.timestamp DESC
            `, [eventId])
        ]);

        // Attach relational arrays to the event object
        event.roster = volunteersResult.rows;
        event.timeline = timelineResult.rows;

        return event;
    }
};

module.exports = AdminEventModel;