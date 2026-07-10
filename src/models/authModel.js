const db = require('../config/db');

const AuthModel = {
    /**
     * Check if a user already exists by their email
     */
    getUserByEmail: async (email) => {
        const queryText = `
            SELECT * FROM users 
            WHERE email = $1 AND is_active = TRUE;
        `;
        const { rows } = await db.query(queryText, [email]);
        return rows[0];
    },

    /**
     * Check if an active user already exists by email OR phone number
     */
    checkUserExists: async (email, phoneNumber) => {
        const queryText = `
            SELECT email, phone_number FROM users 
            WHERE (email = $1 OR phone_number = $2) 
            AND is_active = TRUE;
        `;
        // We check both. If a row is returned, one (or both) already exists.
        const { rows } = await db.query(queryText, [email, phoneNumber]);
        return rows[0]; 
    },

    /**
     * Create a new volunteer account
     */
    createVolunteer: async (userData) => {
        const { firstName, lastName, email, passwordHash, phoneNumber } = userData;
        
        const queryText = `
            INSERT INTO users (first_name, last_name, email, password_hash, phone_number, role)
            VALUES ($1, $2, $3, $4, $5, 'volunteer')
            RETURNING user_id, first_name, last_name, email, role;
        `;
        
        const values = [firstName, lastName, email, passwordHash, phoneNumber];
        const { rows } = await db.query(queryText, values);
        return rows[0];
    }
};

module.exports = AuthModel;