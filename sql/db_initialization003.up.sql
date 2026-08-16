-- =====================================================
-- UP SCRIPT: ADD GAMIFICATION (RANKS & BADGES)
-- =====================================================

-- Connect to the database
\c chembur_samithi_seva;

-- =====================================================
-- 1. RANKS (Overall Seniority)
-- =====================================================
CREATE TABLE IF NOT EXISTS ranks (
    rank_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    min_hours NUMERIC(7,2) NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'shield',
    color_hex VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Ranks
INSERT INTO ranks (name, min_hours, icon_name, color_hex) 
VALUES 
('Rookie', 0, 'shield', '#64748B'),
('Bronze Leader', 20, 'award', '#D97706'),
('Silver Leader', 50, 'star', '#94A3B8'),
('Gold Leader', 100, 'crown', '#EAB308')
ON CONFLICT (name) DO NOTHING;


-- =====================================================
-- 2. BADGES & USER BADGES
-- =====================================================
DO $$ BEGIN
    CREATE TYPE badge_metric AS ENUM ('hours', 'events_count');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS badges (
    badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50) DEFAULT 'medal', 
    target_category VARCHAR(100), 
    criteria_metric badge_metric NOT NULL, 
    criteria_value INTEGER NOT NULL, 
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(badge_id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

-- Insert Example Badges
INSERT INTO badges (name, description, icon_name, target_category, criteria_metric, criteria_value) 
VALUES 
('Eco Warrior', 'Attended 3 Cleanliness Drives', 'leaf', 'Cleanliness', 'events_count', 3),
('Hunger Hero', 'Attended 5 Food Drives', 'utensils', 'Food Drive', 'events_count', 5),
('Vidya Guru', 'Logged 15 hours of Teaching', 'book-open', 'Teaching', 'hours', 15),
('First Blood', 'Attended your very first event', 'check-circle', NULL, 'events_count', 1)
ON CONFLICT (name) DO NOTHING;


-- =====================================================
-- 3. THE AUTOMATION TRIGGER (The Rules Engine)
-- =====================================================
CREATE OR REPLACE FUNCTION evaluate_volunteer_badges()
RETURNS TRIGGER AS $$
DECLARE
    badge_rec RECORD;
    current_stat NUMERIC;
BEGIN
    -- Only evaluate if the user is actively marked present
    IF NEW.status = 'present' THEN
        
        -- Loop through all active badges the user DOES NOT have yet
        FOR badge_rec IN (
            SELECT b.* FROM badges b
            WHERE b.is_active = TRUE
            AND b.badge_id NOT IN (
                SELECT badge_id FROM user_badges WHERE user_id = NEW.volunteer_id
            )
        ) LOOP
            
            -- Calculate the user's current standing for this specific badge's criteria
            IF badge_rec.criteria_metric = 'events_count' THEN
                SELECT COUNT(a.attendance_id) INTO current_stat
                FROM attendance a
                JOIN events e ON a.event_id = e.event_id
                WHERE a.volunteer_id = NEW.volunteer_id AND a.status = 'present'
                AND (badge_rec.target_category IS NULL OR e.category = badge_rec.target_category);
                
            ELSIF badge_rec.criteria_metric = 'hours' THEN
                SELECT COALESCE(SUM(a.hours_logged), 0) INTO current_stat
                FROM attendance a
                JOIN events e ON a.event_id = e.event_id
                WHERE a.volunteer_id = NEW.volunteer_id AND a.status = 'present'
                AND (badge_rec.target_category IS NULL OR e.category = badge_rec.target_category);
            END IF;

            -- Did they hit the milestone?
            IF current_stat >= badge_rec.criteria_value THEN
                -- 1. Award the Badge
                INSERT INTO user_badges (user_id, badge_id) 
                VALUES (NEW.volunteer_id, badge_rec.badge_id);

                -- 2. Announce it on the Community Timeline automatically
                INSERT INTO event_timeline (event_id, user_id, action)
                VALUES (NEW.event_id, NEW.volunteer_id, 'Earned the "' || badge_rec.name || '" badge! 🎉');
            END IF;

        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to fire whenever attendance is updated
DROP TRIGGER IF EXISTS trigger_evaluate_badges ON attendance;
CREATE TRIGGER trigger_evaluate_badges
AFTER INSERT OR UPDATE OF status, hours_logged ON attendance
FOR EACH ROW
EXECUTE FUNCTION evaluate_volunteer_badges();


-- =====================================================
-- 4. UPDATE DASHBOARD VIEW (Dynamic Ranks + Badges JSON)
-- =====================================================
DROP VIEW IF EXISTS volunteer_dashboard_stats;

CREATE VIEW volunteer_dashboard_stats AS
-- 1. Calculate Base Stats (Hours & Events)
WITH user_stats AS (
    SELECT
        u.user_id, 
        u.first_name, 
        u.last_name,
        COUNT(a.attendance_id) FILTER (WHERE a.status = 'present') AS total_activities_attended,
        COALESCE(SUM(a.hours_logged), 0) AS total_hours_logged
    FROM users u
    LEFT JOIN attendance a ON u.user_id = a.volunteer_id
    WHERE u.role = 'volunteer'
    GROUP BY u.user_id, u.first_name, u.last_name
),
-- 2. Aggregate Badges into a clean JSON Array to prevent duplicate rows
user_earned_badges AS (
    SELECT 
        ub.user_id,
        COALESCE(json_agg(
            json_build_object(
                'badge_id', b.badge_id,
                'name', b.name,
                'icon_name', b.icon_name,
                'awarded_at', ub.awarded_at
            )
        ) FILTER (WHERE b.badge_id IS NOT NULL), '[]'::json) as earned_badges
    FROM user_badges ub
    JOIN badges b ON ub.badge_id = b.badge_id
    GROUP BY ub.user_id
)
-- 3. Combine Everything + Dynamic Rank Calculation
SELECT
    us.user_id,
    us.first_name,
    us.last_name,
    us.total_activities_attended,
    us.total_hours_logged,
    
    -- Dynamic Rank Subqueries
    (SELECT name FROM ranks r WHERE r.min_hours <= us.total_hours_logged ORDER BY r.min_hours DESC LIMIT 1) AS current_rank,
    (SELECT icon_name FROM ranks r WHERE r.min_hours <= us.total_hours_logged ORDER BY r.min_hours DESC LIMIT 1) AS current_rank_icon,
    (SELECT color_hex FROM ranks r WHERE r.min_hours <= us.total_hours_logged ORDER BY r.min_hours DESC LIMIT 1) AS current_rank_color,
    (SELECT min_hours FROM ranks r WHERE r.min_hours > us.total_hours_logged ORDER BY r.min_hours ASC LIMIT 1) AS next_rank_hours,
    
    -- Attached Badges Array (Defaults to [] if none)
    COALESCE(ub.earned_badges, '[]'::json) AS earned_badges

FROM user_stats us
LEFT JOIN user_earned_badges ub ON us.user_id = ub.user_id;

-- =====================================================
-- END OF UP SCRIPT
-- =====================================================