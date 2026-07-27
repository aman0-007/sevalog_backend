const db = require('../config/db');

const VolunteerEventModel = {
    /**
     * Fetch all upcoming and ongoing events, along with the user's personal registration status
     */
    getAvailableEvents: async (userId) => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.event_date, e.start_time, e.end_time,
                e.location_name, e.category, e.banner_image_url, e.status AS event_status,
                e.volunteers_needed, e.max_volunteers, e.registration_open, e.waitlist_enabled,
                COALESCE(att_counts.reg_count, 0)::integer AS current_registrations,
                user_att.status AS user_registration_status
            FROM events e
            LEFT JOIN (
                SELECT event_id, COUNT(*) as reg_count 
                FROM attendance 
                WHERE status IN ('registered', 'present') 
                GROUP BY event_id
            ) att_counts ON e.event_id = att_counts.event_id
            LEFT JOIN attendance user_att ON e.event_id = user_att.event_id AND user_att.volunteer_id = $1
            WHERE e.is_deleted = FALSE 
              AND e.visibility = 'public' 
              AND e.status IN ('upcoming', 'ongoing', 'registration_closed')
              AND e.event_date >= CURRENT_DATE
            ORDER BY e.event_date ASC, e.start_time ASC;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows;
    },

    /**
     * Handle Volunteer Registration safely with capacity awareness
     */
    registerForEvent: async (eventId, userId) => {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Lock the event row to prevent race conditions during capacity check
            const eventQuery = `SELECT * FROM events WHERE event_id = $1 FOR UPDATE;`;
            const { rows: eventRows } = await client.query(eventQuery, [eventId]);
            
            if (eventRows.length === 0) throw new Error('Event not found.');
            const event = eventRows[0];

            if (!event.registration_open || event.status === 'cancelled') {
                throw new Error('Registration is closed for this event.');
            }

            // 2. Check current capacity
            const countQuery = `SELECT COUNT(*) FROM attendance WHERE event_id = $1 AND status IN ('registered', 'present');`;
            const { rows: countRows } = await client.query(countQuery, [eventId]);
            const currentCount = parseInt(countRows[0].count);

            let newStatus = 'registered';

            // 3. Capacity & Waitlist Routing
            if (event.max_volunteers && currentCount >= event.max_volunteers) {
                if (event.waitlist_enabled) {
                    newStatus = 'waitlisted';
                } else {
                    throw new Error('Event is at maximum capacity.');
                }
            }

            // 4. Insert or Update (Upsert to handle previous withdrawals)
            const upsertQuery = `
                INSERT INTO attendance (event_id, volunteer_id, status, attendance_method)
                VALUES ($1, $2, $3, 'qr_scan')
                ON CONFLICT (event_id, volunteer_id) 
                DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
                RETURNING *;
            `;
            const { rows: attRows } = await client.query(upsertQuery, [eventId, userId, newStatus]);

            await client.query('COMMIT');
            return { success: true, status: newStatus, attendance: attRows[0] };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Allow user to withdraw from an event
     */
    withdrawFromEvent: async (eventId, userId) => {
        const queryText = `
            UPDATE attendance 
            SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
            WHERE event_id = $1 AND volunteer_id = $2 AND status IN ('registered', 'waitlisted')
            RETURNING *;
        `;
        const { rows } = await db.query(queryText, [eventId, userId]);
        return rows[0];
    },

    /**
     * Fetch all public events (past and future) with the user's historical status
     */
    getAllEventsHistory: async (userId) => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.event_date, e.start_time, e.end_time,
                e.location_name, e.category, e.banner_image_url, e.status AS event_status,
                e.max_volunteers, e.registration_open,
                COALESCE(att_counts.reg_count, 0)::integer AS current_registrations,
                user_att.status AS user_registration_status,
                user_att.check_in_time
            FROM events e
            LEFT JOIN (
                SELECT event_id, COUNT(*) as reg_count 
                FROM attendance 
                WHERE status IN ('registered', 'present') 
                GROUP BY event_id
            ) att_counts ON e.event_id = att_counts.event_id
            LEFT JOIN attendance user_att ON e.event_id = user_att.event_id AND user_att.volunteer_id = $1
            WHERE e.is_deleted = FALSE 
              AND e.visibility = 'public'
            ORDER BY e.event_date DESC, e.start_time DESC; -- Descending for history
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows;
    }
};

module.exports = VolunteerEventModel;