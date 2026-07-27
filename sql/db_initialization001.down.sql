-- ============================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- DOWN / ROLLBACK SCRIPT
-- ============================================================


-- ============================================================
-- 1. DROP TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS audit_tags ON tags;
DROP TRIGGER IF EXISTS audit_skills ON skills;
DROP TRIGGER IF EXISTS audit_attendance ON attendance;
DROP TRIGGER IF EXISTS audit_events ON events;
DROP TRIGGER IF EXISTS audit_users ON users;
DROP TRIGGER IF EXISTS trigger_dashboard_attendance ON attendance;
DROP TRIGGER IF EXISTS trigger_dashboard_users ON users;
DROP TRIGGER IF EXISTS trigger_dashboard_events ON events;
DROP TRIGGER IF EXISTS trigger_auto_close_registration ON attendance;
DROP TRIGGER IF EXISTS refresh_volunteer_cache ON attendance;
DROP TRIGGER IF EXISTS trigger_calculate_hours ON attendance;
DROP TRIGGER IF EXISTS set_timestamp_events ON events;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;


-- ============================================================
-- 2. DROP VIEWS
-- ============================================================

DROP VIEW IF EXISTS volunteer_dashboard_stats;
DROP VIEW IF EXISTS active_events_view;


-- ============================================================
-- 3. DROP FUNCTIONS
-- ============================================================

DROP FUNCTION IF EXISTS audit_trigger();
DROP FUNCTION IF EXISTS refresh_admin_dashboard_cache();
DROP FUNCTION IF EXISTS enforce_auto_close_registration();
DROP FUNCTION IF EXISTS update_volunteer_stats_cache();
DROP FUNCTION IF EXISTS calculate_attendance_hours();
DROP FUNCTION IF EXISTS update_modified_column();


-- ============================================================
-- 4. DROP TABLES
-- ============================================================

DROP TABLE IF EXISTS admin_dashboard_cache;
DROP TABLE IF EXISTS volunteer_stats_cache;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS event_timeline;
DROP TABLE IF EXISTS event_feedback;
DROP TABLE IF EXISTS event_notes;
DROP TABLE IF EXISTS event_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS event_required_skills;
DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS event_organizers;
DROP TABLE IF EXISTS event_documents;
DROP TABLE IF EXISTS event_gallery;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;


-- ============================================================
-- 5. DROP ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS notification_status_enum;
DROP TYPE IF EXISTS notification_type_enum;
DROP TYPE IF EXISTS event_visibility_level;
DROP TYPE IF EXISTS event_priority_level;
DROP TYPE IF EXISTS event_lifecycle_status;
DROP TYPE IF EXISTS blood_group_type;
DROP TYPE IF EXISTS attendance_status;
DROP TYPE IF EXISTS user_role;


-- ============================================================
-- 6. DROP EXTENSIONS
-- ============================================================

DROP EXTENSION IF EXISTS pgcrypto;


-- ============================================================
-- 7. DROP DATABASE
-- ============================================================

-- Disconnect from the database before executing.
-- Example:
\c postgres

DROP DATABASE IF EXISTS chembur_samithi_seva;

-- ============================================================
-- END OF ROLLBACK SCRIPT
-- ============================================================