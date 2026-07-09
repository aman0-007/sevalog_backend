// seedAdmin.js (Run this once from your terminal)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

async function createAdmin() {
    try {
        const email = 'admin@sevalog.com';
        const password = '@Aman007';
        
        // Check if admin already exists
        const checkQuery = `SELECT * FROM users WHERE email = $1`;
        const { rows } = await db.query(checkQuery, [email]);
        
        if (rows.length > 0) {
            console.log('Admin user already exists!');
            process.exit(0);
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert as Admin
        const insertQuery = `
            INSERT INTO users (first_name, last_name, email, password_hash, role)
            VALUES ('Master', 'Admin', $1, $2, 'admin')
            RETURNING user_id, email, role;
        `;
        
        const result = await db.query(insertQuery, [email, passwordHash]);
        console.log('✅ Admin successfully created:', result.rows[0]);

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        process.exit(0); // Closes the database connection
    }
}

createAdmin();