-- =====================================================
-- DOWN SCRIPT: REMOVE GAMIFICATION SYSTEM
-- =====================================================

-- Connect to the database
\c chembur_samithi_seva;

-- 1. Drop View (Dependencies first)
DROP VIEW IF EXISTS volunteer_dashboard_stats;

-- 2. Drop Trigger and Function
DROP TRIGGER IF EXISTS trigger_evaluate_badges ON attendance;
DROP FUNCTION IF EXISTS evaluate_volunteer_badges();

-- 3. Drop Tables
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS ranks;

-- 4. Drop Custom Type
DROP TYPE IF EXISTS badge_metric;

-- 5. Restore Original View
CREATE VIEW volunteer_dashboard_stats AS
SELECT
    u.user_id, 
    u.first_name, 
    u.last_name,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'present') AS total_activities_attended,
    COALESCE(SUM(a.hours_logged), 0) AS total_hours_logged
FROM users u
LEFT JOIN attendance a ON u.user_id = a.volunteer_id
WHERE u.role = 'volunteer'
GROUP BY u.user_id, u.first_name, u.last_name;

-- =====================================================
-- END OF DOWN SCRIPT
-- =====================================================