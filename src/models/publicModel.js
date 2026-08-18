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
     * NEW: Fetch certificate details for public verification
     */
    verifyCertificate: async (certificateId) => {
        const queryText = `
            SELECT 
                c.certificate_id, c.type, c.hours_credited, c.issued_at,
                e.title AS event_title,
                u.first_name, u.last_name
            FROM certificates c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN events e ON c.event_id = e.event_id
            WHERE c.certificate_id = $1;
        `;
        const { rows } = await db.query(queryText, [certificateId]);
        return rows[0] || null;
    }
};

module.exports = PublicModel;