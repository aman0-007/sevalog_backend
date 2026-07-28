-- ============================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- DOWN / ROLLBACK SCRIPT
-- ============================================================

-- ==========================================
-- DROP TRIGGERS
-- ==========================================

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

-- ==========================================
-- DROP FUNCTIONS
-- ==========================================

DROP FUNCTION IF EXISTS audit_trigger();

DROP FUNCTION IF EXISTS refresh_admin_dashboard_cache();

DROP FUNCTION IF EXISTS enforce_auto_close_registration();

DROP FUNCTION IF EXISTS update_volunteer_stats_cache();

DROP FUNCTION IF EXISTS calculate_attendance_hours();

DROP FUNCTION IF EXISTS update_modified_column();

-- ==========================================
-- DROP VIEWS
-- ==========================================

DROP VIEW IF EXISTS volunteer_dashboard_stats;

DROP VIEW IF EXISTS active_events_view;

-- ==========================================
-- DROP INDEXES
-- ==========================================

DROP INDEX IF EXISTS idx_audit_logs_record;

DROP INDEX IF EXISTS idx_attendance_status;
DROP INDEX IF EXISTS idx_attendance_volunteer;
DROP INDEX IF EXISTS idx_attendance_event;

DROP INDEX IF EXISTS idx_events_deleted;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_date;

-- ==========================================
-- DROP TABLES
-- ==========================================

DROP TABLE IF EXISTS admin_dashboard_cache CASCADE;

DROP TABLE IF EXISTS volunteer_stats_cache CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;

DROP TABLE IF EXISTS event_timeline CASCADE;

DROP TABLE IF EXISTS attendance CASCADE;

DROP TABLE IF EXISTS events CASCADE;

DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- DROP ENUM TYPES
-- ==========================================

DROP TYPE IF EXISTS event_lifecycle_status;

DROP TYPE IF EXISTS blood_group_type;

DROP TYPE IF EXISTS attendance_status;

DROP TYPE IF EXISTS user_role;

-- ==========================================
-- DROP EXTENSION
-- ==========================================

DROP EXTENSION IF EXISTS pgcrypto;

-- ==========================================
-- DROP DATABASE
-- ==========================================

-- Connect to another database first (e.g. postgres)
-- \c postgres

DROP DATABASE IF EXISTS chembur_samithi_seva;