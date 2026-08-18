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
            firstName, lastName, dateOfBirth, gender, bloodGroup,
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
                date_of_birth = $3, 
                gender = $4, 
                blood_group = $5, 
                residential_address = $6, 
                city = COALESCE($7, city), 
                state = COALESCE($8, state), 
                pincode = $9, 
                emergency_contact_name = $10, 
                emergency_contact_relation = $11, 
                emergency_contact_number = $12, 
                medical_conditions = $13, 
                education_level = $14, 
                college_name = $15, 
                profession = $16, 
                skills = $17::text[], 
                languages_spoken = $18::text[], 
                interested_activities = $19::text[]
            WHERE user_id = $20 AND role = 'volunteer' AND is_active = TRUE
            RETURNING user_id, first_name, last_name, email;
        `;
        // Note: updated_at is handled automatically by your database trigger.

        const values = [
            firstName || null, 
            lastName || null, 
            dateOfBirth || null, 
            gender || null, 
            bloodGroup || null,
            residentialAddress || null, 
            city || 'Mumbai', 
            state || 'Maharashtra', 
            pincode || null, 
            emergencyContactName || null, 
            emergencyContactRelation || null, 
            emergencyContactNumber || null, 
            medicalConditions || null, 
            educationLevel || null, 
            collegeName || null, 
            profession || null, 
            skills || [], 
            languagesSpoken || [], 
            interestedActivities || [], 
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
            // 1. UPDATED: Overall Impact Stats (Now pulls Ranks and Badges too!)
            db.query(`
                SELECT 
                    total_activities_attended, 
                    total_hours_logged,
                    current_rank,
                    current_rank_icon,
                    current_rank_color,
                    next_rank_hours,
                    earned_badges
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
            impact: statsRes.rows[0] || { 
                total_activities_attended: 0, 
                total_hours_logged: "0.00",
                current_rank: "Rookie",
                earned_badges: []
            },
            upcomingEvents: upcomingRes.rows,
            recentHistory: historyRes.rows
        };
    },

    /**
     * NEW: Fetch all certificates for the logged-in user
     */
    getMyCertificates: async (userId) => {
        const query = `
            SELECT 
                c.certificate_id, c.type, c.hours_credited, c.issued_at,
                COALESCE(e.title, t.title) AS event_title, 
                e.event_date
            FROM certificates c
            LEFT JOIN events e ON c.event_id = e.event_id
            LEFT JOIN tasks t ON c.task_id = t.task_id
            WHERE c.user_id = $1
            ORDER BY c.issued_at DESC;
        `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    },

    /**
     * NEW: Fetch specific certificate data for PDF generation
     */
    getCertificateData: async (certificateId, userId) => {
        const query = `
            SELECT 
                c.certificate_id, c.type, c.hours_credited, c.issued_at,
                COALESCE(e.title, t.title) AS event_title, 
                e.event_date,
                u.first_name, u.last_name
            FROM certificates c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN events e ON c.event_id = e.event_id
            LEFT JOIN tasks t ON c.task_id = t.task_id
            WHERE c.certificate_id = $1 AND c.user_id = $2;
        `;
        const { rows } = await db.query(query, [certificateId, userId]);
        return rows[0];
    },

    /**
     * NEW: Fetch the global community feed
     */
    getCommunityFeed: async (limit = 15) => {
        const query = `
            SELECT 
                t.log_id, 
                t.action, 
                t.timestamp,
                u.first_name, 
                LEFT(u.last_name, 1) AS last_name_initial,
                e.title AS event_title
            FROM event_timeline t
            JOIN users u ON t.user_id = u.user_id
            LEFT JOIN events e ON t.event_id = e.event_id
            ORDER BY t.timestamp DESC
            LIMIT $1;
        `;
        const { rows } = await db.query(query, [limit]);
        return rows;
    },

    /**
     * Get the leaderboard based on filter type (global, city, college)
     */
    getLeaderboard: async (type = 'global', limit = 10) => {
        let groupByColumn = '';
        let selectTag = '';

        if (type === 'city') {
            groupByColumn = 'AND u.city IS NOT NULL';
            selectTag = 'u.city AS group_tag,';
        } else if (type === 'college') {
            groupByColumn = 'AND u.college_name IS NOT NULL';
            selectTag = 'u.college_name AS group_tag,';
        } else {
            selectTag = "'Global' AS group_tag,";
        }

        const queryText = `
            SELECT 
                u.first_name, 
                LEFT(u.last_name, 1) AS last_name_initial,
                ${selectTag}
                vds.total_hours_logged AS total_hours
            FROM volunteer_dashboard_stats vds
            JOIN users u ON vds.user_id = u.user_id
            WHERE u.role = 'volunteer' AND u.is_active = TRUE ${groupByColumn}
            ORDER BY vds.total_hours_logged DESC
            LIMIT $1;
        `;
        const { rows } = await db.query(queryText, [limit]);
        return rows;
    }
};

module.exports = VolunteerModel;