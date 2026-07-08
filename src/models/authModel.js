const db = require('../config/db');

const AuthModel = {
    /**
     * Check if a user already exists by their email
     */
    getUserByEmail: async (email) => {
        const queryText = `SELECT * FROM users WHERE email = $1;`;
        const { rows } = await db.query(queryText, [email]);
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