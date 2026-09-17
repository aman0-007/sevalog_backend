const db = require('../config/db');

const PublicModel = {
    /**
     * Fetch the single most recent upcoming/ongoing published event.
     */
    getLatestEvent: async () => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.description, e.event_date, e.start_time, e.end_time, 
                e.location_name, e.location_address, e.google_maps_link, 
                e.volunteers_needed, e.max_volunteers,
                e.registration_open, e.registration_deadline,
                
                -- Calculate how many volunteers have already registered
                (
                    SELECT COUNT(*) 
                    FROM attendance a 
                    WHERE a.event_id = e.event_id AND a.status IN ('registered', 'present')
                )::integer AS current_registered,

                -- Calculate real-time dynamic phase
                CASE 
                    WHEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date = e.event_date AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time BETWEEN e.start_time AND e.end_time THEN 'ongoing'
                    ELSE 'upcoming'
                END AS time_phase
            FROM events e
            WHERE e.is_deleted = FALSE 
              AND e.status = 'published' 
              AND (
                  e.event_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date 
                  OR (e.event_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AND e.end_time > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time)
              )
            ORDER BY e.event_date ASC, e.start_time ASC
            LIMIT 1;
        `;
        const { rows } = await db.query(queryText);
        return rows[0] || null;
    },

    /**
     * Fetch upcoming published events for the listing cards (Highly Optimized)
     */
    getAllUpcomingEvents: async (limit = 10, offset = 0) => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.category, 
                e.event_date, e.start_time, e.end_time, 
                e.location_name, -- Only the name, not the full address/map link
                e.volunteers_needed, e.max_volunteers,
                e.registration_open, e.registration_deadline,
                
                (
                    SELECT COUNT(*) 
                    FROM attendance a 
                    WHERE a.event_id = e.event_id AND a.status IN ('registered', 'present')
                )::integer AS current_registered,

                CASE 
                    WHEN CURRENT_DATE = e.event_date AND CURRENT_TIME BETWEEN e.start_time AND e.end_time THEN 'ongoing'
                    ELSE 'upcoming'
                END AS time_phase,

                COUNT(*) OVER()::integer AS full_count

            FROM events e
            WHERE e.is_deleted = FALSE 
              AND e.status = 'published' 
              AND (
                  e.event_date > CURRENT_DATE 
                  OR (e.event_date = CURRENT_DATE AND e.end_time > CURRENT_TIME)
              )
            ORDER BY e.event_date ASC, e.start_time ASC
            LIMIT $1 OFFSET $2;
        `;
        
        const { rows } = await db.query(queryText, [parseInt(limit, 10), parseInt(offset, 10)]);
        
        const totalCount = rows.length > 0 ? rows[0].full_count : 0;
        const cleanedRows = rows.map(({ full_count, ...rest }) => rest);

        return { data: cleanedRows, totalCount };
    },

    /**
     * Fetch the full details for a single public event
     */
    getPublicEventDetails: async (eventId) => {
        const queryText = `
            SELECT 
                e.event_id, e.title, e.description, e.category, 
                e.event_date, e.start_time, e.end_time, 
                e.location_name, e.location_address, e.google_maps_link,
                e.contact_person_name, e.contact_person_phone,
                e.volunteers_needed, e.max_volunteers,
                e.registration_open, e.registration_deadline,
                
                (
                    SELECT COUNT(*) 
                    FROM attendance a 
                    WHERE a.event_id = e.event_id AND a.status IN ('registered', 'present')
                )::integer AS current_registered
            FROM events e
            WHERE e.event_id = $1 
              AND e.is_deleted = FALSE 
              AND e.status = 'published';
        `;
        
        const { rows } = await db.query(queryText, [eventId]);
        return rows[0] || null;
    },

    /**
     * NEW: Fetch certificate details for public verification & download
     */
    verifyCertificate: async (certificateId) => {
        const queryText = `
            SELECT 
                c.certificate_id, c.type, c.hours_credited, c.issued_at, c.description,
                COALESCE(e.title, t.title) AS event_title,
                e.event_date,
                u.first_name, u.last_name
            FROM certificates c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN events e ON c.event_id = e.event_id
            LEFT JOIN tasks t ON c.task_id = t.task_id
            WHERE c.certificate_id = $1;
        `;
        const { rows } = await db.query(queryText, [certificateId]);
        return rows[0] || null;
    },

    /**
     * Comprehensive Public Impact & Organization Statistics
     * Aggregates verified seva hours, community participation, events breakdown,
     * task completions, certificate milestones, and category impact.
     */
    getPublicImpactStats: async () => {
        const queryText = `
            WITH event_hours_calc AS (
                SELECT COALESCE(SUM(hours_logged), 0) AS total_event_hours
                FROM attendance
                WHERE status = 'present'
            ),
            task_hours_calc AS (
                SELECT COALESCE(SUM(hours_awarded), 0) AS total_task_hours
                FROM tasks
                WHERE status = 'completed' AND is_deleted = FALSE
            ),
            total_volunteers_calc AS (
                SELECT COUNT(*) AS total_registered_volunteers
                FROM users
                WHERE role = 'volunteer' AND is_active = TRUE
            ),
            active_volunteers_calc AS (
                SELECT COUNT(DISTINCT user_id) AS active_volunteers_count
                FROM (
                    SELECT volunteer_id AS user_id FROM attendance WHERE status = 'present'
                    UNION
                    SELECT assigned_to AS user_id FROM tasks WHERE status = 'completed' AND is_deleted = FALSE
                ) active_pool
            ),
            events_metrics AS (
                SELECT 
                    COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_events_created,
                    COUNT(*) FILTER (WHERE status = 'completed' AND is_deleted = FALSE) AS total_events_completed,
                    COUNT(*) FILTER (WHERE status = 'published' AND is_deleted = FALSE) AS total_events_active
                FROM events
            ),
            tasks_metrics AS (
                SELECT 
                    COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_tasks_created,
                    COUNT(*) FILTER (WHERE status = 'completed' AND is_deleted = FALSE) AS total_tasks_completed
                FROM tasks
            ),
            attendance_metrics AS (
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'present') AS total_attendances_marked,
                    COUNT(*) FILTER (WHERE status IN ('registered', 'present')) AS total_registrations_received
                FROM attendance
            ),
            certificates_metrics AS (
                SELECT 
                    COUNT(*) AS total_certificates_issued,
                    COUNT(*) FILTER (WHERE type = 'master') AS master_certificates_issued,
                    COUNT(*) FILTER (WHERE type = 'event') AS event_certificates_issued,
                    COUNT(*) FILTER (WHERE type = 'task') AS task_certificates_issued
                FROM certificates
            ),
            badges_metrics AS (
                SELECT COUNT(*) AS total_badges_unlocked
                FROM user_badges
            )
            SELECT 
                (SELECT total_event_hours FROM event_hours_calc) AS event_hours,
                (SELECT total_task_hours FROM task_hours_calc) AS task_hours,
                (SELECT total_registered_volunteers FROM total_volunteers_calc) AS total_volunteers,
                (SELECT active_volunteers_count FROM active_volunteers_calc) AS active_volunteers,
                (SELECT total_events_created FROM events_metrics) AS total_events_created,
                (SELECT total_events_completed FROM events_metrics) AS total_events_completed,
                (SELECT total_events_active FROM events_metrics) AS total_events_active,
                (SELECT total_tasks_created FROM tasks_metrics) AS total_tasks_created,
                (SELECT total_tasks_completed FROM tasks_metrics) AS total_tasks_completed,
                (SELECT total_attendances_marked FROM attendance_metrics) AS total_attendances_marked,
                (SELECT total_registrations_received FROM attendance_metrics) AS total_registrations_received,
                (SELECT total_certificates_issued FROM certificates_metrics) AS total_certificates_issued,
                (SELECT master_certificates_issued FROM certificates_metrics) AS master_certificates_issued,
                (SELECT event_certificates_issued FROM certificates_metrics) AS event_certificates_issued,
                (SELECT task_certificates_issued FROM certificates_metrics) AS task_certificates_issued,
                (SELECT total_badges_unlocked FROM badges_metrics) AS total_badges_unlocked;
        `;

        const categoryQuery = `
            SELECT 
                e.category,
                COUNT(DISTINCT e.event_id) AS events_count,
                COALESCE(SUM(a.hours_logged), 0) AS hours_logged,
                COUNT(a.attendance_id) FILTER (WHERE a.status = 'present') AS volunteer_participations
            FROM events e
            LEFT JOIN attendance a ON e.event_id = a.event_id AND a.status = 'present'
            WHERE e.is_deleted = FALSE AND e.status IN ('published', 'completed')
            GROUP BY e.category
            ORDER BY hours_logged DESC, events_count DESC;
        `;

        const rankDistributionQuery = `
            SELECT 
                r.name AS rank_name,
                r.min_hours,
                r.color_hex,
                r.icon_name,
                COUNT(v.user_id) AS volunteer_count
            FROM ranks r
            LEFT JOIN (
                SELECT 
                    u.user_id,
                    (COALESCE(att.event_hours, 0) + COALESCE(tsk.task_hours, 0)) AS total_hours
                FROM users u
                LEFT JOIN (
                    SELECT volunteer_id, SUM(hours_logged) AS event_hours
                    FROM attendance WHERE status = 'present' GROUP BY volunteer_id
                ) att ON u.user_id = att.volunteer_id
                LEFT JOIN (
                    SELECT assigned_to, SUM(hours_awarded) AS task_hours
                    FROM tasks WHERE status = 'completed' AND is_deleted = FALSE GROUP BY assigned_to
                ) tsk ON u.user_id = tsk.assigned_to
                WHERE u.role = 'volunteer' AND u.is_active = TRUE
            ) v ON v.total_hours >= r.min_hours AND NOT EXISTS (
                SELECT 1 FROM ranks r2 WHERE r2.min_hours > r.min_hours AND v.total_hours >= r2.min_hours
            )
            GROUP BY r.rank_id, r.name, r.min_hours, r.color_hex, r.icon_name
            ORDER BY r.min_hours ASC;
        `;

        const [mainStatsRes, categoryStatsRes, rankStatsRes] = await Promise.all([
            db.query(queryText),
            db.query(categoryQuery),
            db.query(rankDistributionQuery)
        ]);

        return {
            summary: mainStatsRes.rows[0] || {},
            categories: categoryStatsRes.rows || [],
            rankDistribution: rankStatsRes.rows || []
        };
    }
};

module.exports = PublicModel;