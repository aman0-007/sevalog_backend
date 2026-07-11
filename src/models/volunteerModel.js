const db = require('../config/db');

const VolunteerModel = {
    /**
     * Update a volunteer's comprehensive profile/biographical data
     */
    updateProfile: async (userId, profileData) => {
        const {
            firstName, lastName, phoneNumber, dateOfBirth, gender, bloodGroup,
            residentialAddress, city, state, pincode,
            emergencyContactName, emergencyContactRelation, emergencyContactNumber, medicalConditions,
            educationLevel, professionOrCollege,
            skills, languagesSpoken, interestedActivities
        } = profileData;

        const queryText = `
            UPDATE users 
            SET 
                first_name = $1, 
                last_name = $2, 
                phone_number = $3, 
                date_of_birth = $4, 
                gender = $5, 
                blood_group = $6, 
                residential_address = $7, 
                city = COALESCE($8, city), 
                state = COALESCE($9, state), 
                pincode = $10, 
                emergency_contact_name = $11, 
                emergency_contact_relation = $12, 
                emergency_contact_number = $13, 
                medical_conditions = $14, 
                education_level = $15, 
                profession_or_college = $16, 
                skills = $17, 
                languages_spoken = $18, 
                interested_activities = $19,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $20 AND role = 'volunteer' AND is_active = TRUE
            RETURNING user_id, first_name, last_name, email;
        `;

        const values = [
            firstName, lastName, phoneNumber, dateOfBirth, gender, bloodGroup,
            residentialAddress, city, state, pincode, emergencyContactName, 
            emergencyContactRelation, emergencyContactNumber, medicalConditions, 
            educationLevel, professionOrCollege, skills, languagesSpoken, 
            interestedActivities, userId
        ];

        const { rows } = await db.query(queryText, values);
        return rows[0];
    },

    /**
     * Retrieve aggregated dashboard stats for a specific volunteer from the optimized cache table
     */
    getDashboardStats: async (userId) => {
        const queryText = `
            SELECT 
                total_hours_logged, 
                total_activities_attended, 
                last_updated
            FROM volunteer_stats_cache
            WHERE volunteer_id = $1;
        `;
        
        const { rows } = await db.query(queryText, [userId]);
        
        // If no cache row exists yet (new user with no attendance records), return default zeros
        return rows[0] || { total_hours_logged: "0.00", total_activities_attended: 0, last_updated: null };
    },

    /**
     * Get all upcoming events and check if the current user has already registered
     */
    getUpcomingEvents: async (userId) => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.description, e.event_date, e.start_time, e.end_time, 
                e.location_name, e.volunteers_needed,
                a.status AS user_status
            FROM events e
            LEFT JOIN attendance a ON e.event_id = a.event_id AND a.volunteer_id = $1
            WHERE e.event_date >= CURRENT_DATE
            ORDER BY e.event_date ASC;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows;
    },

    /**
     * Apply for a specific event
     */
    applyForEvent: async (userId, eventId) => {
        const queryText = `
            INSERT INTO attendance (event_id, volunteer_id, status, hours_logged)
            VALUES ($1, $2, 'registered', 0.00)
            RETURNING attendance_id, status, created_at AS applied_at;
        `;
        const { rows } = await db.query(queryText, [eventId, userId]);
        return rows[0];
    },

    /**
     * Get ALL events (past and future) using the view, along with the user's specific status
     */
    getAllEventsWithUserStatus: async (userId) => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.description, e.category, 
                e.event_date, e.start_time, e.end_time, 
                e.location_name, e.location_address, e.google_maps_link, 
                e.contact_person_name, e.contact_person_phone, 
                e.volunteers_needed, e.event_status,
                a.status AS user_status, a.hours_logged
            FROM events_with_status e
            LEFT JOIN attendance a ON e.event_id = a.event_id AND a.volunteer_id = $1
            ORDER BY e.event_date ASC, e.start_time ASC;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows;
    },

    /**
     * Get a volunteer's current profile data
     */
    getProfile: async (userId) => {
        const queryText = `
            SELECT 
                first_name, last_name, email, phone_number, date_of_birth, gender, blood_group,
                residential_address, city, state, pincode,
                emergency_contact_name, emergency_contact_relation, emergency_contact_number, medical_conditions,
                education_level, profession_or_college, skills, languages_spoken, interested_activities
            FROM users 
            WHERE user_id = $1 AND role = 'volunteer' AND is_active = TRUE;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows[0];
    },
};

module.exports = VolunteerModel;