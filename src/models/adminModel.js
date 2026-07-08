const db = require('../config/db');

const AdminModel = {
    /**
     * Create a brand new Seva event/activity
     */
    createEvent: async (adminId, eventData) => {
        const {
            title, description, eventDate, startTime, endTime,
            locationName, locationAddress, googleMapsLink, volunteersNeeded, skillsRequired
        } = eventData;

        const queryText = `
            INSERT INTO events (
                created_by, title, description, event_date, start_time, end_time,
                location_name, location_address, google_maps_link, volunteers_needed, skills_required
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING event_id, title, event_date, volunteers_needed;
        `;

        const values = [
            adminId, title, description, eventDate, startTime, endTime,
            locationName, locationAddress, googleMapsLink, volunteersNeeded, skillsRequired
        ];

        const { rows } = await db.query(queryText, values);
        return rows[0];
    },

    /**
     * View complete details of an event, including its registration list and actual attendance records
     */
    getEventDetailsReport: async (eventId) => {
        // 1. Fetch the main event criteria
        const eventQuery = `SELECT * FROM events WHERE event_id = $1;`;
        const eventResult = await db.query(eventQuery, [eventId]);
        
        if (eventResult.rows.length === 0) return null;

        // 2. Fetch all volunteers who applied alongside their application status and attendance record
        const volunteersQuery = `
            SELECT 
                u.user_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone_number,
                ea.status AS application_status,
                ea.applied_at,
                att.status AS attendance_status,
                att.hours_logged
            FROM event_applications ea
            JOIN users u ON ea.volunteer_id = u.user_id
            LEFT JOIN attendance att ON ea.event_id = att.event_id AND ea.volunteer_id = att.volunteer_id
            WHERE ea.event_id = $1
            ORDER BY ea.applied_at ASC;
        `;
        const volunteersResult = await db.query(volunteersQuery, [eventId]);

        return {
            event: eventResult.rows[0],
            volunteers: volunteersResult.rows
        };
    },

    /**
     * Fetch high-level organizational stats for the Admin Summary Cards
     */
    getGlobalSamithiStats: async () => {
        const queryText = `
            SELECT 
                (SELECT COUNT(*)::INT FROM users WHERE role = 'volunteer') AS total_active_volunteers,
                (SELECT COUNT(*)::INT FROM events) AS total_events_conducted,
                (SELECT COALESCE(SUM(total_hours_logged), 0.00)::NUMERIC(10,2) FROM volunteer_stats_cache) AS total_cumulative_seva_hours;
        `;
        const { rows } = await db.query(queryText);
        return rows[0];
    }
};

module.exports = AdminModel;