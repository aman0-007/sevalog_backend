const db = require('../config/db');

const AdminModel = {

    /**
     * Fetch comprehensive, high-level organizational stats and recent activities
     */
    getAdminDashboardStats: async () => {
        const [metricsResult, topVolunteersResult, upcomingEventsResult, recentActivityResult] = await Promise.all([
            // 1. High-Level Aggregates (Using subqueries for blazing fast index-only scans)
            db.query(`
                SELECT 
                    (SELECT COUNT(*)::INT FROM users WHERE role = 'volunteer' AND is_active = TRUE) AS total_active_volunteers,
                    (SELECT COUNT(*)::INT FROM users WHERE role = 'volunteer' AND created_at >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')) AS new_volunteers_this_month,
                    (SELECT COALESCE(SUM(hours_logged), 0)::NUMERIC(10,2) FROM attendance WHERE status = 'present') AS total_seva_hours,
                    (SELECT COUNT(*)::INT FROM events WHERE is_deleted = FALSE AND status = 'completed') AS total_completed_events,
                    (SELECT COUNT(*)::INT FROM events WHERE is_deleted = FALSE AND status = 'published' AND event_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date) AS upcoming_published_events,
                    (SELECT COUNT(*)::INT FROM events WHERE is_deleted = FALSE AND status = 'draft') AS action_required_drafts
            `),

            // 2. Top 5 Volunteers Leaderboard (Highest hours logged)
            db.query(`
                SELECT u.user_id, u.first_name, u.last_name, vsc.total_hours_logged, vsc.total_activities_attended
                FROM volunteer_dashboard_stats vsc
                JOIN users u ON vsc.user_id = u.user_id
                WHERE u.is_active = TRUE AND vsc.total_hours_logged > 0
                ORDER BY vsc.total_hours_logged DESC
                LIMIT 5;
            `),

            // 3. Next 5 Upcoming Events (Utilizing your active_events_view for capacity tracking)
            db.query(`
                SELECT 
                    event_id, title, event_date, start_time, 
                    volunteers_needed, current_registered_count
                FROM active_events_view
                WHERE event_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
                ORDER BY event_date ASC, start_time ASC
                LIMIT 5;
            `),

            // 4. Recent System Activity (Audit trail of what just happened)
            db.query(`
                SELECT 
                    t.log_id, t.action, t.timestamp, 
                    u.first_name AS actor_first_name, u.last_name AS actor_last_name, 
                    e.title AS event_title
                FROM event_timeline t
                LEFT JOIN users u ON t.user_id = u.user_id
                LEFT JOIN events e ON t.event_id = e.event_id
                ORDER BY t.timestamp DESC
                LIMIT 5;
            `)
        ]);

        return {
            overview: metricsResult.rows[0],
            topVolunteers: topVolunteersResult.rows,
            upcomingEvents: upcomingEventsResult.rows,
            recentActivity: recentActivityResult.rows
        };
    },

    /**
     * View all registered volunteers with search, sorting, and pagination
     */
    getAllVolunteers: async (filters = {}) => {
        const { search, status, sortBy, sortOrder = 'DESC', limit = 50, offset = 0 } = filters;
        
        let queryParams = [];
        let whereClauses = ["u.role = 'volunteer'"]; // Strictly fetch only volunteers

        // Search across Name, Email, or Phone
        if (search) {
            queryParams.push(`%${search}%`);
            whereClauses.push(`(u.first_name ILIKE $${queryParams.length} OR u.last_name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length} OR u.phone_number ILIKE $${queryParams.length})`);
        }

        // Filter by active/inactive status
        if (status === 'active') whereClauses.push(`u.is_active = TRUE`);
        if (status === 'inactive') whereClauses.push(`u.is_active = FALSE`);

        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        let orderClause = `ORDER BY u.created_at ${safeSortOrder}`;
        
        if (sortBy === 'name') orderClause = `ORDER BY u.first_name ${safeSortOrder}, u.last_name ${safeSortOrder}`;
        if (sortBy === 'hours') orderClause = `ORDER BY total_hours_served ${safeSortOrder}`;

        const baseQuery = `
            SELECT 
                u.user_id, u.role, u.first_name, u.last_name, u.email, u.phone_number, u.city, u.created_at, u.is_active,
                COALESCE(vsc.total_hours_logged, 0) AS total_hours_served,
                COUNT(*) OVER()::integer AS full_count
            FROM users u
            LEFT JOIN volunteer_dashboard_stats vsc ON u.user_id = vsc.user_id
            WHERE ${whereClauses.join(' AND ')}
            ${orderClause}
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `;

        queryParams.push(parseInt(limit, 10));
        queryParams.push(parseInt(offset, 10));

        const { rows } = await db.query(baseQuery, queryParams);
        
        const totalCount = rows.length > 0 ? rows[0].full_count : 0;
        const cleanedRows = rows.map(({ full_count, ...rest }) => rest);

        return { data: cleanedRows, totalCount };
    },

    /**
     * View a single volunteer's comprehensive profile and their event history
     */
    getVolunteerDetails: async (userId) => {
        // Fetch profile stats and event history in parallel
        const [profileResult, historyResult] = await Promise.all([
            db.query(`
                SELECT 
                    u.user_id, u.role, u.first_name, u.last_name, u.email, u.phone_number, 
                    u.date_of_birth, u.gender, u.blood_group, u.residential_address, u.city, u.state, u.pincode,
                    u.emergency_contact_name, u.emergency_contact_relation, u.emergency_contact_number,
                    u.medical_conditions, u.education_level, u.college_name, u.profession,
                    u.skills, u.languages_spoken, u.interested_activities, u.created_at, u.is_active,
                    COALESCE(vsc.total_hours_logged, 0) AS total_hours_served,
                    COALESCE(vsc.total_activities_attended, 0) AS total_activities_count
                FROM users u
                LEFT JOIN volunteer_dashboard_stats vsc ON u.user_id = vsc.user_id
                WHERE u.user_id = $1 AND u.role = 'volunteer';
            `, [userId]),

            // Fetch the volunteer's attendance history for admin oversight
            db.query(`
                SELECT 
                    a.attendance_id, a.status, a.hours_logged, a.check_in_time, a.check_out_time,
                    e.event_id, e.title, e.event_date
                FROM attendance a
                JOIN events e ON a.event_id = e.event_id
                WHERE a.volunteer_id = $1
                ORDER BY e.event_date DESC, a.created_at DESC;
            `, [userId])
        ]);

        if (profileResult.rows.length === 0) return null;

        const profile = profileResult.rows[0];
        profile.attendance_history = historyResult.rows;

        return profile;
    },

    /**
     * Soft-delete/Ban a volunteer and withdraw them from future events
     */
    deactivateVolunteer: async (volunteerId, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            // 1. Soft-delete the user
            const userResult = await client.query(`
                UPDATE users 
                SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2 
                WHERE user_id = $1 AND role = 'volunteer' AND is_active = TRUE
                RETURNING user_id;
            `, [volunteerId, adminId]);

            if (userResult.rows.length === 0) throw new Error("USER_NOT_FOUND");

            // 2. Withdraw them from any events that haven't happened yet
            await client.query(`
                UPDATE attendance 
                SET status = 'withdrawn', admin_remarks = 'System auto-withdraw: Account deactivated.'
                WHERE volunteer_id = $1 
                  AND status = 'registered'
                  AND event_id IN (
                      SELECT event_id FROM events 
                      WHERE status IN ('draft', 'published') 
                        AND event_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
                  );
            `, [volunteerId]);

            await client.query("COMMIT");
            return true;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = AdminModel;