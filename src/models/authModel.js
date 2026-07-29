const db = require('../config/db');

const AuthModel = {
    /**
     * Check if a user already exists by their email
     */
    getUserByEmail: async (email) => {
        const queryText = `
            SELECT user_id, first_name, last_name, email, role, password_hash 
            FROM users 
            WHERE email = $1 AND is_active = TRUE;
        `;
        const { rows } = await db.query(queryText, [email.toLowerCase()]);
        return rows[0];
    },

    /**
     * Check if an active user already exists by email OR phone number
     */
    checkUserExists: async (email, phoneNumber) => {
        const queryText = `
            SELECT email, phone_number 
            FROM users 
            WHERE (email = $1 OR (phone_number = $2 AND $2 IS NOT NULL)) 
            AND is_active = TRUE;
        `;
        const { rows } = await db.query(queryText, [email.toLowerCase(), phoneNumber || null]);
        return rows[0];
    },

    /**
     * Create a new volunteer account
     */
    createVolunteer: async (userData) => {
        const { firstName, lastName, email, passwordHash, phoneNumber, collegeName, profession } = userData;
        
        const queryText = `
            INSERT INTO users (
                first_name, last_name, email, password_hash, 
                phone_number, role, college_name, profession
            )
            VALUES ($1, $2, $3, $4, $5, 'volunteer', $6, $7)
            RETURNING user_id, first_name, last_name, email, role;
        `;
        
        const values = [
            firstName, 
            lastName, 
            email.toLowerCase(), 
            passwordHash, 
            phoneNumber || null,
            collegeName || null,
            profession || null
        ];
        
        const { rows } = await db.query(queryText, values);
        return rows[0];
    },

    /**
     * Get user by ID (Needed to verify old password)
     */
    getUserByIdForAuth: async (userId) => {
        const queryText = `
            SELECT user_id, password_hash 
            FROM users 
            WHERE user_id = $1 AND is_active = TRUE;
        `;
        const { rows } = await db.query(queryText, [userId]);
        return rows[0];
    },

    /**
     * Update user password
     */
    updatePassword: async (userId, passwordHash) => {
        const queryText = `
            UPDATE users 
            SET password_hash = $1 
            WHERE user_id = $2 
            RETURNING user_id;
        `;
        // updated_at is handled automatically by your Postgres trigger `set_timestamp_users`!
        await db.query(queryText, [passwordHash, userId]);
    },

    
};

module.exports = AuthModel;