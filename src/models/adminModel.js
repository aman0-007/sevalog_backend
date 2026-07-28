const db = require('../config/db');

const AdminModel = {

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
     * View all registered volunteers (Lightweight for Table)
     */
    getAllVolunteers: async () => {
        const queryText = `
            SELECT 
                u.user_id, u.first_name, u.last_name, u.email, u.phone_number, u.role, u.city, u.created_at,
                COALESCE(vsc.total_hours_logged, 0) AS total_hours_served
            FROM users u
            LEFT JOIN volunteer_stats_cache vsc ON u.user_id = vsc.volunteer_id
            ORDER BY u.created_at DESC;
        `;
        const { rows } = await db.query(queryText);
        return rows;
    },

    /**
     * View a single volunteer's comprehensive profile
     */
    getVolunteerDetails: async (userId) => {
        const queryText = `
            SELECT 
                u.user_id, u.first_name, u.last_name, u.email, u.phone_number, u.role, 
                u.date_of_birth, u.gender, u.blood_group, u.residential_address, u.city, u.state, u.pincode,
                u.emergency_contact_name, u.emergency_contact_relation, u.emergency_contact_number,
                u.medical_conditions, u.education_level, u.profession_or_college, 
                u.skills, u.languages_spoken, u.interested_activities, u.created_at, u.is_active,
                COALESCE(vsc.total_hours_logged, 0) AS total_hours_served,
                COALESCE(vsc.total_activities_attended, 0) AS total_activities_count
            FROM users u
            LEFT JOIN volunteer_stats_cache vsc ON u.user_id = vsc.volunteer_id
            WHERE u.user_id = $1;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows[0];
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