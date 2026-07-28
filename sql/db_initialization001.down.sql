-- =====================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- DOWN SCRIPT
-- =====================================================

-- Triggers
DROP TRIGGER IF EXISTS trigger_calculate_hours ON attendance;
DROP TRIGGER IF EXISTS set_timestamp_events ON events;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;

-- Functions
DROP FUNCTION IF EXISTS calculate_attendance_hours();
DROP FUNCTION IF EXISTS update_modified_column();

-- Views
DROP VIEW IF EXISTS volunteer_dashboard_stats;
DROP VIEW IF EXISTS active_events_view;

-- Indexes
DROP INDEX IF EXISTS idx_attendance_status;
DROP INDEX IF EXISTS idx_attendance_volunteer;
DROP INDEX IF EXISTS idx_attendance_event;

DROP INDEX IF EXISTS idx_events_deleted;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_date;

-- Tables
DROP TABLE IF EXISTS event_timeline CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ENUM Types
DROP TYPE IF EXISTS event_lifecycle_status;
DROP TYPE IF EXISTS blood_group_type;
DROP TYPE IF EXISTS attendance_status;
DROP TYPE IF EXISTS user_role;

-- Extension (optional)
DROP EXTENSION IF EXISTS pgcrypto;

-- Database (run only after connecting to another database, e.g. postgres)
\c postgres
DROP DATABASE IF EXISTS chembur_samithi_seva;