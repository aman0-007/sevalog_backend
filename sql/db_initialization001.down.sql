-- =====================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- Unified Down Script (Complete Teardown)
-- =====================================================

-- Connect to the database
\c chembur_samithi_seva;

-- =====================================================
-- 1. DROP VIEWS
-- =====================================================
DROP VIEW IF EXISTS volunteer_dashboard_stats CASCADE;
DROP VIEW IF EXISTS active_events_view CASCADE;


-- =====================================================
-- 2. DROP TRIGGERS AND FUNCTIONS
-- =====================================================
-- Gamification Triggers
DROP TRIGGER IF EXISTS trigger_evaluate_task_badges ON tasks;
DROP TRIGGER IF EXISTS trigger_evaluate_badges ON attendance;
DROP FUNCTION IF EXISTS trigger_evaluate_badges_func() CASCADE;

-- Master Certificate Triggers (NEW)
DROP TRIGGER IF EXISTS trig_master_cert_att ON attendance;
DROP TRIGGER IF EXISTS trig_master_cert_task ON tasks;
DROP FUNCTION IF EXISTS update_master_certificate() CASCADE;

-- Event Certificate Triggers
DROP TRIGGER IF EXISTS trigger_auto_certificates ON events;
DROP FUNCTION IF EXISTS generate_event_certificates() CASCADE;

-- Attendance Hours Triggers
DROP TRIGGER IF EXISTS trigger_calculate_hours ON attendance;
DROP FUNCTION IF EXISTS calculate_attendance_hours() CASCADE;

-- Auto-Updated_At Triggers
DROP TRIGGER IF EXISTS set_timestamp_tasks ON tasks;
DROP TRIGGER IF EXISTS set_timestamp_events ON events;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;


-- =====================================================
-- 3. DROP TABLES (In exact reverse order of dependencies)
-- =====================================================
-- Gamification Tables
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS ranks CASCADE;

-- Certificate Tables
DROP TABLE IF EXISTS certificates CASCADE;

-- Task Management Tables
DROP TABLE IF EXISTS task_timeline CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Core Tracking Tables
DROP TABLE IF EXISTS event_timeline CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;

-- Core Entity Tables
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- =====================================================
-- 4. DROP ENUM TYPES
-- =====================================================
DROP TYPE IF EXISTS event_category CASCADE;
DROP TYPE IF EXISTS certificate_type CASCADE;
DROP TYPE IF EXISTS badge_metric CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS event_lifecycle_status CASCADE;
DROP TYPE IF EXISTS blood_group_type CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

\c postgres
DROP DATABASE IF EXISTS chembur_samithi_seva;

-- =====================================================
-- END OF DOWN SCRIPT
-- =====================================================