require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

async function createUser(user) {
    const existing = await db.query(
        "SELECT user_id FROM users WHERE email = $1",
        [user.email]
    );

    if (existing.rows.length) {
        console.log(`✅ ${user.role} already exists: ${user.email}`);
        return;
    }

    const passwordHash = await bcrypt.hash(user.password, 12);

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
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
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
            user.role,
            user.first_name,
            user.last_name,
            user.email,
            passwordHash,
            user.profession
        ]
    );

    console.log(result.rows[0]);
    console.log(`✅ ${user.role} created successfully.`);
}

async function seedUsers() {
    try {
        // =========================
        // ADMIN
        // =========================
        const admin = {
            role: "admin",
            first_name: "Master",
            last_name: "Admin",
            email: "admin@sevalog.in",
            password: "123456",
            profession: "System Administrator"
        };

        // =========================
        // VOLUNTEER USER
        // =========================
        const user = {
            role: "volunteer",
            first_name: "Aman",
            last_name: "Dwivedi",
            email: "dwivediaman@gmail.com",
            password: "123456",
            profession: "Software Developer"
        };

        await createUser(admin);
        await createUser(user);

    } catch (err) {
        console.error("❌ Seeding failed:", err);
    }
}

seedUsers();

// Run:
// node scripts/initialSeed.js
//
// Or:
// npm run db:seed-admin