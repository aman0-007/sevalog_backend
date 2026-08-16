-- =====================================================
-- DOWN SCRIPT: REMOVE TASK MANAGEMENT SYSTEM
-- =====================================================

-- Connect to the correct database first!
\c chembur_samithi_seva;

-- 1. Drop the trigger
DROP TRIGGER IF EXISTS set_timestamp_tasks ON tasks;

-- 2. Drop tables (timeline must be dropped first due to foreign key constraints)
DROP TABLE IF EXISTS task_timeline;
DROP TABLE IF EXISTS tasks;

-- 3. Drop the custom ENUM type
DROP TYPE IF EXISTS task_status;

-- =====================================================
-- END OF DOWN SCRIPT
-- =====================================================