-- =====================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- Unified Initial Setup (Core + Tasks + Gamification + Certificates)
-- =====================================================

-- Database Setup
CREATE DATABASE chembur_samithi_seva;
\c chembur_samithi_seva;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================
CREATE TYPE user_role AS ENUM ('admin', 'volunteer');
CREATE TYPE attendance_status AS ENUM ('registered', 'withdrawn', 'present', 'absent', 'waitlisted');
CREATE TYPE blood_group_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE event_lifecycle_status AS ENUM ('draft', 'published', 'completed', 'cancelled', 'archived');
CREATE TYPE task_status AS ENUM ('assigned', 'in_progress', 'pending_verification', 'completed', 'cancelled');
CREATE TYPE badge_metric AS ENUM ('hours', 'events_count');
CREATE TYPE certificate_type AS ENUM ('event', 'master');
CREATE TYPE event_category AS ENUM ('Cleanliness', 'Food Drive', 'Teaching', 'Medical Camp', 'Animal Welfare', 'Other');

-- =====================================================
-- 2. CORE TABLES (Users, Events, Attendance, Timeline)
-- =====================================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL DEFAULT 'volunteer',
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group blood_group_type,
    residential_address TEXT,
    city VARCHAR(100) DEFAULT 'Mumbai',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_relation VARCHAR(50),
    emergency_contact_number VARCHAR(20),
    medical_conditions TEXT,
    education_level VARCHAR(100),
    college_name VARCHAR(150),
    profession VARCHAR(150),
    CONSTRAINT chk_college_or_profession CHECK (college_name IS NOT NULL OR profession IS NOT NULL),
    skills TEXT[],
    languages_spoken TEXT[],
    interested_activities TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id)
);

CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category event_category DEFAULT 'Other',
    status event_lifecycle_status DEFAULT 'draft',
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    registration_open BOOLEAN DEFAULT FALSE,
    volunteers_needed INTEGER NOT NULL CHECK (volunteers_needed > 0),
    min_volunteers INTEGER DEFAULT 1,
    max_volunteers INTEGER,
    CONSTRAINT chk_volunteer_limits CHECK (max_volunteers IS NULL OR max_volunteers >= min_volunteers),
    location_name VARCHAR(150) NOT NULL,
    location_address TEXT NOT NULL,
    google_maps_link VARCHAR(255),
    contact_person_name VARCHAR(100),
    contact_person_phone VARCHAR(20),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_registration_deadline CHECK (registration_deadline IS NULL OR registration_deadline <= (event_date + end_time))
);

CREATE TABLE attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    marked_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status attendance_status NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    hours_logged NUMERIC(5,2) DEFAULT 0.00,
    feedback TEXT,
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_volunteer_per_event UNIQUE (event_id, volunteer_id),
    CONSTRAINT chk_checkout_after_checkin CHECK (check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time)
);

CREATE TABLE event_timeline (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE, -- NULLABLE for global badge/system logs
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. TASK MANAGEMENT SYSTEM
-- =====================================================
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_to UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    status task_status DEFAULT 'assigned',
    is_public BOOLEAN DEFAULT TRUE,
    volunteer_remarks TEXT,
    admin_remarks TEXT,
    hours_awarded NUMERIC(5,2) DEFAULT 0.00, -- Native Task Hours Support
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_timeline (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. VERIFIABLE CERTIFICATES
-- =====================================================
CREATE TABLE certificates (
    certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type certificate_type NOT NULL DEFAULT 'event',
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE, 
    hours_credited NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_certificate UNIQUE (user_id, event_id)
);

-- =====================================================
-- 5. GAMIFICATION (Ranks & Badges)
-- =====================================================
CREATE TABLE ranks (
    rank_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    min_hours NUMERIC(7,2) NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'shield',
    color_hex VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE badges (
    badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50) DEFAULT 'medal', 
    target_category event_category, 
    criteria_metric badge_metric NOT NULL, 
    criteria_value INTEGER NOT NULL, 
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_badges (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(badge_id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id)
);

-- Seed Initial Ranks & Badges
INSERT INTO ranks (name, min_hours, icon_name, color_hex) VALUES 
('Rookie', 0, 'shield', '#64748B'),
('Bronze Leader', 20, 'award', '#D97706'),
('Silver Leader', 50, 'star', '#94A3B8'),
('Gold Leader', 100, 'crown', '#EAB308');

INSERT INTO badges (name, description, icon_name, target_category, criteria_metric, criteria_value) VALUES 
('Eco Warrior', 'Attended 3 Cleanliness Drives', 'leaf', 'Cleanliness', 'events_count', 3),
('Hunger Hero', 'Attended 5 Food Drives', 'utensils', 'Food Drive', 'events_count', 5),
('Vidya Guru', 'Logged 15 hours of Teaching', 'book-open', 'Teaching', 'hours', 15),
('First Blood', 'Attended your very first event', 'check-circle', NULL, 'events_count', 1);

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update `updated_at` column
CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER set_timestamp_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER set_timestamp_tasks BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Auto-calculate attendance hours
CREATE OR REPLACE FUNCTION calculate_attendance_hours() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.hours_logged := ROUND((EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0)::NUMERIC, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_hours BEFORE INSERT OR UPDATE OF check_in_time, check_out_time ON attendance
FOR EACH ROW WHEN (NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL)
EXECUTE FUNCTION calculate_attendance_hours();

-- Auto-generate certificates on event completion
CREATE OR REPLACE FUNCTION generate_event_certificates() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        INSERT INTO certificates (user_id, type, event_id, hours_credited)
        SELECT volunteer_id, 'event', NEW.event_id, hours_logged
        FROM attendance WHERE event_id = NEW.event_id AND status = 'present'
        ON CONFLICT (user_id, event_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_certificates AFTER UPDATE OF status ON events
FOR EACH ROW EXECUTE FUNCTION generate_event_certificates();

-- Unified Gamification Engine (Evaluates Badges based on BOTH Attendance AND Tasks)
CREATE OR REPLACE FUNCTION trigger_evaluate_badges_func() RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_event_id UUID := NULL;
    badge_rec RECORD;
    current_stat NUMERIC;
BEGIN
    IF TG_TABLE_NAME = 'attendance' THEN
        IF NEW.status != 'present' THEN RETURN NEW; END IF;
        v_user_id := NEW.volunteer_id;
        v_event_id := NEW.event_id;
    ELSIF TG_TABLE_NAME = 'tasks' THEN
        IF NEW.status != 'completed' THEN RETURN NEW; END IF;
        v_user_id := NEW.assigned_to;
        v_event_id := NEW.event_id;
    END IF;

    FOR badge_rec IN (
        SELECT b.* FROM badges b WHERE b.is_active = TRUE AND b.badge_id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = v_user_id)
    ) LOOP
        IF badge_rec.criteria_metric = 'events_count' THEN
            SELECT 
                (SELECT COUNT(*) FROM attendance a LEFT JOIN events e ON a.event_id = e.event_id WHERE a.volunteer_id = v_user_id AND a.status = 'present' AND (badge_rec.target_category IS NULL OR e.category = badge_rec.target_category))
                +
                (SELECT COUNT(*) FROM tasks t LEFT JOIN events e ON t.event_id = e.event_id WHERE t.assigned_to = v_user_id AND t.status = 'completed' AND (badge_rec.target_category IS NULL OR e.category = badge_rec.target_category))
            INTO current_stat;
        ELSIF badge_rec.criteria_metric = 'hours' THEN
            SELECT 
                (SELECT COALESCE(SUM(hours_logged), 0) FROM attendance a LEFT JOIN events e ON a.event_id = e.event_id WHERE a.volunteer_id = v_user_id AND a.status = 'present' AND (badge_rec.target_category IS NULL OR e.category = badge_rec.target_category))
                +
                (SELECT COALESCE(SUM(hours_awarded), 0) FROM tasks t LEFT JOIN events e ON t.event_id = e.event_id WHERE t.assigned_to = v_user_id AND t.status = 'completed' AND (badge_rec.target_category IS NULL OR e.category = badge_rec.target_category))
            INTO current_stat;
        END IF;

        IF current_stat >= badge_rec.criteria_value THEN
            INSERT INTO user_badges (user_id, badge_id) VALUES (v_user_id, badge_rec.badge_id);
            INSERT INTO event_timeline (event_id, user_id, action) VALUES (v_event_id, v_user_id, 'Earned the "' || badge_rec.name || '" badge! 🎉');
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_evaluate_badges AFTER INSERT OR UPDATE OF status, check_out_time ON attendance FOR EACH ROW EXECUTE FUNCTION trigger_evaluate_badges_func();
CREATE TRIGGER trigger_evaluate_task_badges AFTER INSERT OR UPDATE OF status, hours_awarded ON tasks FOR EACH ROW EXECUTE FUNCTION trigger_evaluate_badges_func();

-- =====================================================
-- 7. VIEWS
-- =====================================================
CREATE VIEW active_events_view AS
SELECT e.*, COALESCE((SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.event_id AND a.status IN ('registered', 'present')), 0) AS current_registered_count
FROM events e WHERE e.is_deleted = FALSE AND e.status NOT IN ('draft', 'cancelled', 'archived');

CREATE VIEW volunteer_dashboard_stats AS
WITH att_stats AS (
    SELECT volunteer_id AS user_id, COUNT(attendance_id) AS events_attended, COALESCE(SUM(hours_logged), 0) AS event_hours
    FROM attendance WHERE status = 'present' GROUP BY volunteer_id
),
task_stats AS (
    SELECT assigned_to AS user_id, COUNT(task_id) AS tasks_completed, COALESCE(SUM(hours_awarded), 0) AS task_hours
    FROM tasks WHERE status = 'completed' GROUP BY assigned_to
),
user_combined_stats AS (
    SELECT
        u.user_id, u.first_name, u.last_name,
        COALESCE(a.events_attended, 0) + COALESCE(t.tasks_completed, 0) AS total_activities_attended,
        COALESCE(a.event_hours, 0) + COALESCE(t.task_hours, 0) AS total_hours_logged
    FROM users u
    LEFT JOIN att_stats a ON u.user_id = a.user_id
    LEFT JOIN task_stats t ON u.user_id = t.user_id
    WHERE u.role = 'volunteer'
),
user_earned_badges AS (
    SELECT ub.user_id, COALESCE(json_agg(json_build_object('badge_id', b.badge_id, 'name', b.name, 'icon_name', b.icon_name, 'awarded_at', ub.awarded_at)) FILTER (WHERE b.badge_id IS NOT NULL), '[]'::json) as earned_badges
    FROM user_badges ub JOIN badges b ON ub.badge_id = b.badge_id GROUP BY ub.user_id
)
SELECT
    us.user_id, us.first_name, us.last_name, us.total_activities_attended, us.total_hours_logged,
    (SELECT name FROM ranks r WHERE r.min_hours <= us.total_hours_logged ORDER BY r.min_hours DESC LIMIT 1) AS current_rank,
    (SELECT icon_name FROM ranks r WHERE r.min_hours <= us.total_hours_logged ORDER BY r.min_hours DESC LIMIT 1) AS current_rank_icon,
    (SELECT color_hex FROM ranks r WHERE r.min_hours <= us.total_hours_logged ORDER BY r.min_hours DESC LIMIT 1) AS current_rank_color,
    (SELECT min_hours FROM ranks r WHERE r.min_hours > us.total_hours_logged ORDER BY r.min_hours ASC LIMIT 1) AS next_rank_hours,
    COALESCE(ub.earned_badges, '[]'::json) AS earned_badges
FROM user_combined_stats us
LEFT JOIN user_earned_badges ub ON us.user_id = ub.user_id;

-- =====================================================
-- 8. INDEXES (Optimized for Dashboard & Triggers)
-- =====================================================
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_deleted ON events(is_deleted);
CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_attendance_volunteer ON attendance(volunteer_id);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_certificates_user ON certificates(user_id);