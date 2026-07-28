-- =====================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- =====================================================

-- Database
CREATE DATABASE chembur_samithi_seva;
\c chembur_samithi_seva;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM TYPES
CREATE TYPE user_role AS ENUM (
    'admin',
    'volunteer'
);

CREATE TYPE attendance_status AS ENUM (
    'registered',
    'withdrawn',
    'present',
    'absent'
);

CREATE TYPE blood_group_type AS ENUM (
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
);

CREATE TYPE event_lifecycle_status AS ENUM (
    'draft',
    'published',
    'completed',
    'cancelled',
    'archived'
);

-- USERS
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

    CONSTRAINT chk_college_or_profession
        CHECK (
            college_name IS NOT NULL
            OR profession IS NOT NULL
        ),

    -- Multi-value fields
    skills TEXT[],
    languages_spoken TEXT[],
    interested_activities TEXT[],

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
        REFERENCES users(user_id)
);

-- EVENTS
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    status event_lifecycle_status
        DEFAULT 'draft',

    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    registration_deadline TIMESTAMP WITH TIME ZONE,
    registration_open BOOLEAN DEFAULT FALSE,

    volunteers_needed INTEGER NOT NULL
        CHECK (volunteers_needed > 0),

    min_volunteers INTEGER DEFAULT 1,
    max_volunteers INTEGER,

    CONSTRAINT chk_volunteer_limits
        CHECK (
            max_volunteers IS NULL
            OR max_volunteers >= min_volunteers
        ),

    location_name VARCHAR(150) NOT NULL,
    location_address TEXT NOT NULL,
    google_maps_link VARCHAR(255),

    contact_person_name VARCHAR(100),
    contact_person_phone VARCHAR(20),

    qr_code_token VARCHAR(255) UNIQUE,
    qr_expiry TIMESTAMP WITH TIME ZONE,

    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
        REFERENCES users(user_id),

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_time_order
        CHECK (end_time > start_time),

    CONSTRAINT chk_registration_deadline
        CHECK (
            registration_deadline IS NULL
            OR registration_deadline <= (event_date + end_time)
        )
);

-- ATTENDANCE
CREATE TABLE attendance (
    attendance_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    volunteer_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    marked_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    status attendance_status NOT NULL,

    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,

    hours_logged NUMERIC(5,2)
        DEFAULT 0.00,

    feedback TEXT,
    admin_remarks TEXT,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_volunteer_per_event
        UNIQUE (event_id, volunteer_id),

    CONSTRAINT chk_checkout_after_checkin
        CHECK (
            check_out_time IS NULL
            OR check_in_time IS NULL
            OR check_out_time >= check_in_time
        )
);

-- EVENT TIMELINE
CREATE TABLE event_timeline (
    log_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    action VARCHAR(255) NOT NULL,

    timestamp TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_events_date
    ON events(event_date);

CREATE INDEX idx_events_status
    ON events(status);

CREATE INDEX idx_events_deleted
    ON events(is_deleted);

CREATE INDEX idx_attendance_event
    ON attendance(event_id);

CREATE INDEX idx_attendance_volunteer
    ON attendance(volunteer_id);

CREATE INDEX idx_attendance_status
    ON attendance(status);

-- VIEWS
CREATE VIEW active_events_view AS
SELECT
    e.*,
    COALESCE(
        (
            SELECT COUNT(*)
            FROM attendance a
            WHERE a.event_id = e.event_id
            AND a.status IN ('registered', 'present')
        ),
        0
    ) AS current_registered_count
FROM events e
WHERE
    e.is_deleted = FALSE
    AND e.status NOT IN (
        'draft',
        'cancelled',
        'archived'
    );

CREATE VIEW volunteer_dashboard_stats AS
SELECT
    u.user_id,
    u.first_name,
    u.last_name,
    COUNT(a.attendance_id)
        FILTER (
            WHERE a.status = 'present'
        ) AS total_activities_attended,
    COALESCE(
        SUM(a.hours_logged),
        0
    ) AS total_hours_logged
FROM users u
LEFT JOIN attendance a
    ON u.user_id = a.volunteer_id
WHERE
    u.role = 'volunteer'
GROUP BY
    u.user_id,
    u.first_name,
    u.last_name;

-- UPDATE updated_at AUTOMATICALLY
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_timestamp_events
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- CALCULATE ATTENDANCE HOURS
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.check_in_time IS NOT NULL
       AND NEW.check_out_time IS NOT NULL THEN

        NEW.hours_logged := ROUND(
            (
                EXTRACT(
                    EPOCH FROM (
                        NEW.check_out_time - NEW.check_in_time
                    )
                ) / 3600.0
            )::NUMERIC,
            2
        );

    END IF;

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_hours
BEFORE INSERT OR UPDATE OF check_in_time, check_out_time
ON attendance
FOR EACH ROW
EXECUTE FUNCTION calculate_attendance_hours();

-- =====================================================
-- END OF SCHEMA
-- =====================================================