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
     * View all Seva events/activities
     */
    getAllEventsAdmin: async () => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.event_date, e.start_time, e.end_time, e.location_name, e.volunteers_needed,
                (SELECT COUNT(*)::INT
                FROM attendance
                WHERE event_id = e.event_id AND status != 'withdrawn') AS current_registrations
            FROM events e
            ORDER BY e.event_date DESC;
        `;
        const { rows } = await db.query(queryText);
        return rows;
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
                att.created_at AS applied_at,
                att.status AS attendance_status,
                att.hours_logged
            FROM attendance att
            JOIN users u ON att.volunteer_id = u.user_id
            WHERE att.event_id = $1
            ORDER BY att.created_at ASC;
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
    },

    /**
     * View all registered volunteers with their extended profile and total hours/events served
     */
    getAllVolunteers: async () => {
        const queryText = `
            SELECT 
                u.user_id, u.first_name, u.last_name, u.email, u.phone_number, u.role, u.created_at,
                u.profession_or_college, u.city, u.skills, 
                -- u.bio, <-- Commented out until you run the ALTER TABLE later!
                COALESCE(vsc.total_hours_logged, 0) AS total_hours_served,
                COALESCE(vsc.total_activities_attended, 0) AS total_activities_count
            FROM users u
            LEFT JOIN volunteer_stats_cache vsc ON u.user_id = vsc.volunteer_id
            ORDER BY u.created_at DESC;
        `;
        const { rows } = await db.query(queryText);
        return rows;
    },

    /**
     * Mark a volunteer's attendance and log their hours for an event
     */
    markAttendance: async (eventId, volunteerId, adminId, status, hoursLogged) => {
        // If they are absent, ensure hours logged is strictly 0
        const finalHours = status === 'absent' ? 0 : hoursLogged;

        const queryText = `
            INSERT INTO attendance (event_id, volunteer_id, marked_by, status, hours_logged)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (event_id, volunteer_id) 
            DO UPDATE SET 
                status = EXCLUDED.status,
                hours_logged = EXCLUDED.hours_logged,
                marked_by = EXCLUDED.marked_by
            RETURNING attendance_id, status, hours_logged;
        `;

        const values = [eventId, volunteerId, adminId, status, finalHours];
        const { rows } = await db.query(queryText, values);
        return rows[0];
    }
};

module.exports = AdminModel;