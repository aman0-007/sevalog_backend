require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

async function createAdmin() {
    try {
        const admin = {
            first_name: "Master",
            last_name: "Admin",
            email: "admin@sevalog.in",
            password: "123456",
            profession: "System Administrator"
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
                password_hash,
                profession
            )
            VALUES
            (
                'admin',
                $1,
                $2,
                $3,
                $4,
                $5
            )
            RETURNING
                user_id,
                first_name,
                last_name,
                email,
                role,
                profession
            `,
            [
                admin.first_name,
                admin.last_name,
                admin.email,
                passwordHash,
                admin.profession
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