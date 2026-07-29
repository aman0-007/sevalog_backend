const db = require('../config/db');

const VolunteerModel = {

    /**
     * Get a volunteer's current profile data
     */
    getProfile: async (userId) => {
        const queryText = `
            SELECT 
                first_name, last_name, email, phone_number, date_of_birth, gender, blood_group,
                residential_address, city, state, pincode,
                emergency_contact_name, emergency_contact_relation, emergency_contact_number, medical_conditions,
                education_level, college_name, profession, 
                skills, languages_spoken, interested_activities, created_at
            FROM users 
            WHERE user_id = $1 AND role = 'volunteer' AND is_active = TRUE;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows[0];
    },

    /**
     * Update a volunteer's comprehensive profile/biographical data
     */
    updateProfile: async (userId, profileData) => {
        const {
            firstName, lastName, phoneNumber, dateOfBirth, gender, bloodGroup,
            residentialAddress, city, state, pincode,
            emergencyContactName, emergencyContactRelation, emergencyContactNumber, medicalConditions,
            educationLevel, collegeName, profession,
            skills, languagesSpoken, interestedActivities
        } = profileData;

        // Using standard Postgres array casting for multi-value fields
        const queryText = `
            UPDATE users 
            SET 
                first_name = COALESCE($1, first_name), 
                last_name = COALESCE($2, last_name), 
                phone_number = COALESCE($3, phone_number), 
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
                college_name = $16, 
                profession = $17, 
                skills = $18::text[], 
                languages_spoken = $19::text[], 
                interested_activities = $20::text[]
            WHERE user_id = $21 AND role = 'volunteer' AND is_active = TRUE
            RETURNING user_id, first_name, last_name, email;
        `;
        // Note: updated_at is handled automatically by your database trigger.

        const values = [
            firstName, lastName, phoneNumber, dateOfBirth || null, gender || null, bloodGroup || null,
            residentialAddress || null, city || 'Mumbai', state || 'Maharashtra', pincode || null, 
            emergencyContactName || null, emergencyContactRelation || null, emergencyContactNumber || null, 
            medicalConditions || null, educationLevel || null, collegeName || null, profession || null, 
            skills || '{}', languagesSpoken || '{}', interestedActivities || '{}', 
            userId
        ];

        const { rows } = await db.query(queryText, values);
        return rows[0];
    },

    /**
     * Retrieve a comprehensive dashboard data matrix for a specific volunteer.
     */
    getDashboardData: async (userId) => {
        const [statsRes, upcomingRes, historyRes] = await Promise.all([
            // 1. Overall Impact Stats (from your View)
            db.query(`
                SELECT total_activities_attended, total_hours_logged 
                FROM volunteer_dashboard_stats 
                WHERE user_id = $1;
            `, [userId]),

            // 2. Upcoming Commitments (Next 3 events they are registered for)
            db.query(`
                SELECT 
                    e.event_id, e.title, e.event_date, e.start_time, e.end_time, 
                    e.location_name, e.location_address
                FROM attendance a
                JOIN events e ON a.event_id = e.event_id
                WHERE a.volunteer_id = $1 
                  AND a.status = 'registered' 
                  AND (e.event_date > CURRENT_DATE OR (e.event_date = CURRENT_DATE AND e.end_time > CURRENT_TIME))
                  AND e.status IN ('published')
                ORDER BY e.event_date ASC, e.start_time ASC
                LIMIT 3;
            `, [userId]),

            // 3. Recent Activity History (Last 5 events attended)
            db.query(`
                SELECT 
                    e.event_id, e.title, e.category, e.event_date, 
                    a.hours_logged, a.check_in_time, a.check_out_time
                FROM attendance a
                JOIN events e ON a.event_id = e.event_id
                WHERE a.volunteer_id = $1 AND a.status = 'present'
                ORDER BY e.event_date DESC
                LIMIT 5;
            `, [userId])
        ]);

        return {
            impact: statsRes.rows[0] || { total_activities_attended: 0, total_hours_logged: "0.00" },
            upcomingEvents: upcomingRes.rows,
            recentHistory: historyRes.rows
        };
    }
};

module.exports = VolunteerModel;