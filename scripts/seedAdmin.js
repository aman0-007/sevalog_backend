require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

async function createAdmin() {
    try {
        const admin = {
            first_name: "Master",
            last_name: "Admin",
            email: "admin@sevalog.com",
            password: "@Aman007"
        };

        const existing = await db.query(
            "SELECT user_id FROM users WHERE email = $1",
            [admin.email]
        );

        if (existing.rows.length) {
            console.log("✅ Admin already exists.");
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(admin.password, 12);

        const result = await db.query(
            `
            INSERT INTO users
            (
                role,
                first_name,
                last_name,
                email,
                password_hash
            )
            VALUES
            (
                'admin',
                $1,
                $2,
                $3,
                $4
            )
            RETURNING
                user_id,
                first_name,
                last_name,
                email,
                role
            `,
            [
                admin.first_name,
                admin.last_name,
                admin.email,
                passwordHash
            ]
        );

        console.log(result.rows[0]);
        console.log("✅ Admin created successfully.");

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

createAdmin();

//node scripts/seedAdmin.js
//npm run db:seed-admin