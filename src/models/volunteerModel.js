const db = require('../config/db');

const VolunteerModel = {
    /**
     * Update a volunteer's comprehensive profile/biographical data
     */
    updateProfile: async (userId, profileData) => {
        const {
            firstName, lastName, phoneNumber, dateOfBirth, gender, bloodGroup,
            residentialAddress, pincode, emergencyContactName, emergencyContactRelation,
            emergencyContactNumber, medicalConditions, educationLevel, professionOrCollege,
            skills, languagesSpoken
        } = profileData;

        const queryText = `
            UPDATE users 
            SET 
                first_name = $1, last_name = $2, phone_number = $3, date_of_birth = $4, 
                gender = $5, blood_group = $6, residential_address = $7, pincode = $8, 
                emergency_contact_name = $9, emergency_contact_relation = $10, 
                emergency_contact_number = $11, medical_conditions = $12, 
                education_level = $13, profession_or_college = $14, 
                skills = $15, languages_spoken = $16
            WHERE user_id = $17 AND role = 'volunteer'
            RETURNING user_id, first_name, last_name, email;
        `;

        const values = [
            firstName, lastName, phoneNumber, dateOfBirth, gender, bloodGroup,
            residentialAddress, pincode, emergencyContactName, emergencyContactRelation,
            emergencyContactNumber, medicalConditions, educationLevel, professionOrCollege,
            skills, languagesSpoken, userId
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
     * Get all upcoming events that the volunteer can apply for
     */
    getUpcomingEvents: async () => {
        const queryText = `
            SELECT event_id, title, description, event_date, start_time, end_time, 
                   location_name, volunteers_needed 
            FROM events 
            WHERE event_date >= CURRENT_DATE
            ORDER BY event_date ASC;
        `;
        const { rows } = await db.query(queryText);
        return rows;
    },

    /**
     * Apply for a specific event
     */
    applyForEvent: async (userId, eventId) => {
        const queryText = `
            INSERT INTO event_applications (event_id, volunteer_id, status)
            VALUES ($1, $2, 'pending')
            RETURNING application_id, status, applied_at;
        `;
        const { rows } = await db.query(queryText, [eventId, userId]);
        return rows[0];
    }
};

module.exports = VolunteerModel;