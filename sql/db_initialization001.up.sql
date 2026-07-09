-- 1. Create the Database
CREATE DATABASE chembur_samithi_seva;

-- Connect to the database (if using psql command line)
-- \c chembur_samithi_seva;
-- ==========================================
-- 2. Create Custom ENUM Types for Data Integrity
-- ==========================================

CREATE TYPE user_role AS ENUM ('admin', 'volunteer');
CREATE TYPE attendance_status AS ENUM ('present', 'absent');
CREATE TYPE blood_group_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- ==========================================
-- 3. Create Tables
-- ==========================================

-- USERS TABLE (Stores both Admins and Volunteers with max bio-data)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role DEFAULT 'volunteer',

    -- Core Identity
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group blood_group_type,

    -- Location & Contact
    residential_address TEXT,
    city VARCHAR(100) DEFAULT 'Mumbai',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(10),

    -- Emergency Info
    emergency_contact_name VARCHAR(100),
    emergency_contact_relation VARCHAR(50),
    emergency_contact_number VARCHAR(20),
    medical_conditions TEXT, -- Important for physical seva activities

    -- Background & Skills
    education_level VARCHAR(100),
    profession_or_college VARCHAR(150),
    skills TEXT[],
    languages_spoken TEXT[], 
    interested_activities TEXT[],

    -- System timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

    -- Active status for soft deletion
    is_active BOOLEAN DEFAULT TRUE
);

-- EVENTS TABLE (Activities created by Admin)
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Admin who created it

    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Time
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Location
    location_name VARCHAR(150) NOT NULL,
    location_address TEXT NOT NULL,
    google_maps_link VARCHAR(255),

    -- Contact
    contact_person_name VARCHAR(100),
    contact_person_phone VARCHAR(20),

    -- Banner
    banner_image_url TEXT,

    -- Requirements
    volunteers_needed INTEGER NOT NULL CHECK (volunteers_needed > 0),

    -- System timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ATTENDANCE TABLE (Tracking actual participation and hours)
CREATE TABLE attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    marked_by UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Admin who marked attendance
    status attendance_status NOT NULL,
    hours_logged NUMERIC(5,2) DEFAULT 0.00, -- Allows for partial hours like 2.5
    feedback TEXT, -- Optional notes from the admin about the volunteer's performance

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- A volunteer can only have one attendance record per event
    UNIQUE(event_id, volunteer_id)
);

-- ==========================================
-- 4. Create Indexes for Performance
-- ==========================================

-- Speeds up queries when loading dashboards or filtering events
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_attendance_volunteer ON attendance(volunteer_id);
CREATE INDEX idx_attendance_event ON attendance(event_id);

-- ==========================================
-- 5. Create Dashboard View (For the Student/Volunteer UI)
-- ==========================================

-- This view instantly calculates the status of events (upcoming, live, completed) for volunteers
CREATE VIEW events_with_status AS
SELECT
    e.*,
    CASE
        WHEN NOW() < (e.event_date + e.start_time)
            THEN 'upcoming'

        WHEN NOW() BETWEEN (e.event_date + e.start_time)
                       AND (e.event_date + e.end_time)
            THEN 'live'

        ELSE 'completed'
    END AS event_status
FROM events e;

-- This view instantly calculates total hours and events for a user
CREATE VIEW volunteer_dashboard_stats AS
SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    COUNT(a.attendance_id) FILTER (WHERE a.status = 'present') AS total_activities_attended,
    COALESCE(SUM(a.hours_logged), 0) AS total_hours_logged
FROM users u
LEFT JOIN 
    attendance a ON u.user_id = a.volunteer_id
WHERE 
    u.role = 'volunteer'
GROUP BY 
    u.user_id, u.first_name, u.last_name;

-- 1. Create the reusable function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the users table
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 3. Attach the trigger to the events table
CREATE TRIGGER set_timestamp_events
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 1. Create the Cache Table
CREATE TABLE volunteer_stats_cache (
    volunteer_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    total_hours_logged NUMERIC(7,2) DEFAULT 0.00,
    total_activities_attended INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create the Upsert (Update or Insert) Logic Function
CREATE OR REPLACE FUNCTION update_volunteer_stats_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_volunteer_id UUID;
BEGIN

    -- Determine which volunteer needs their stats updated (handles insert, update, or delete)
    IF TG_OP = 'DELETE' THEN
        target_volunteer_id = OLD.volunteer_id;
    ELSE
        target_volunteer_id = NEW.volunteer_id;
    END IF;

    -- Recalculate and Upsert (Insert if new, Update if exists) the data for this specific volunteer
    INSERT INTO volunteer_stats_cache (volunteer_id, total_hours_logged, total_activities_attended, last_updated)
    SELECT 
        target_volunteer_id,
        COALESCE(SUM(hours_logged), 0.00),
        COUNT(attendance_id) FILTER (WHERE status = 'present'),
        CURRENT_TIMESTAMP
    FROM attendance
    WHERE volunteer_id = target_volunteer_id
    ON CONFLICT (volunteer_id) 
    DO UPDATE SET 
        total_hours_logged = EXCLUDED.total_hours_logged,
        total_activities_attended = EXCLUDED.total_activities_attended,
        last_updated = EXCLUDED.last_updated;
    RETURN NULL; -- AFTER triggers can return NULL
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger to the attendance table
CREATE TRIGGER refresh_volunteer_cache
AFTER INSERT OR UPDATE OR DELETE ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_volunteer_stats_cache();