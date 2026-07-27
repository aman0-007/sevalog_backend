require("dotenv").config();
const db = require("../src/config/db");

async function clearDatabase() {
    try {
        await db.query("BEGIN");

        await db.query(`
            TRUNCATE TABLE
                admin_dashboard_cache,
                volunteer_stats_cache,
                notifications,
                audit_logs,
                event_timeline,
                event_feedback,
                event_notes,
                event_tags,
                tags,
                event_required_skills,
                user_skills,
                skills,
                event_organizers,
                event_documents,
                event_gallery,
                attendance,
                events,
                users
            RESTART IDENTITY
            CASCADE;
        `);

        await db.query("COMMIT");

        console.log("✅ Database cleared successfully.");
    } catch (err) {
        await db.query("ROLLBACK");
        console.error("❌ Failed to clear database.");
        console.error(err);
    } finally {
        process.exit();
    }
}

clearDatabase();

// node scripts/clearDatabase.js
// npm run db:clear2