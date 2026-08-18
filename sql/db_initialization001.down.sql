-- Connect to the database
\c chembur_samithi_seva;

DROP VIEW IF EXISTS volunteer_dashboard_stats CASCADE;
DROP VIEW IF EXISTS active_events_view CASCADE;

-- Generalized Activity Certificate Triggers
DROP TRIGGER IF EXISTS trigger_auto_event_certificates ON events;
DROP TRIGGER IF EXISTS trigger_auto_task_certificates ON tasks;
DROP FUNCTION IF EXISTS generate_activity_certificates() CASCADE;

-- Master Certificate Triggers 
DROP TRIGGER IF EXISTS trig_master_cert_att ON attendance;
DROP TRIGGER IF EXISTS trig_master_cert_task ON tasks;
DROP FUNCTION IF EXISTS update_master_certificate() CASCADE;

-- Gamification Triggers
DROP TRIGGER IF EXISTS trigger_evaluate_task_badges ON tasks;
DROP TRIGGER IF EXISTS trigger_evaluate_badges ON attendance;
DROP FUNCTION IF EXISTS trigger_evaluate_badges_func() CASCADE;

-- Attendance Hours Triggers
DROP TRIGGER IF EXISTS trigger_calculate_hours ON attendance;
DROP FUNCTION IF EXISTS calculate_attendance_hours() CASCADE;

-- Auto-Updated_At Triggers
DROP TRIGGER IF EXISTS set_timestamp_tasks ON tasks;
DROP TRIGGER IF EXISTS set_timestamp_events ON events;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;

DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS ranks CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS task_timeline CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS event_timeline CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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