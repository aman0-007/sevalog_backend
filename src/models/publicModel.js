const db = require('../config/db');

const PublicModel = {
    /**
     * Fetch the single most recent upcoming event
     */
    getLatestEvent: async () => {
        const queryText = `
            SELECT 
                event_id, title, description, event_date, start_time, end_time, 
                location_name, location_address, google_maps_link, volunteers_needed
            FROM events 
            WHERE event_date >= CURRENT_DATE
            ORDER BY event_date ASC
            LIMIT 1;
        `;
        const { rows } = await db.query(queryText);
        return rows[0] || null; // Returns the event, or null if there are no upcoming events
    }
};

module.exports = PublicModel;