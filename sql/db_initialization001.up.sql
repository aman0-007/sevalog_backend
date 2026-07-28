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
    'absent',
    'waitlisted',
    'late',
    'excused'
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
    'registration_open',
    'registration_closed',
    'upcoming',
    'ongoing',
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
    profession_or_college VARCHAR(150),

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

    waitlist_enabled BOOLEAN DEFAULT FALSE,
    auto_close_registration BOOLEAN DEFAULT TRUE,

    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    recurrence_end_date DATE,

    location_name VARCHAR(150) NOT NULL,
    location_address TEXT NOT NULL,
    google_maps_link VARCHAR(255),

    contact_person_name VARCHAR(100),
    contact_person_phone VARCHAR(20),

    banner_image_url TEXT,

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
        CHECK (end_time > start_time)
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

    attendance_method VARCHAR(50)
        DEFAULT 'manual',

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

-- AUDIT LOGS
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,

    old_values JSONB,
    new_values JSONB,

    timestamp TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);

-- VOLUNTEER STATS CACHE
CREATE TABLE volunteer_stats_cache (
    volunteer_id UUID PRIMARY KEY
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    total_hours_logged NUMERIC(7,2)
        DEFAULT 0.00,

    total_activities_attended INTEGER
        DEFAULT 0,

    last_updated TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);

-- ADMIN DASHBOARD CACHE
CREATE TABLE admin_dashboard_cache (
    id INTEGER PRIMARY KEY
        DEFAULT 1
        CHECK (id = 1),

    total_events INTEGER
        DEFAULT 0,

    upcoming_events INTEGER
        DEFAULT 0,

    ongoing_events INTEGER
        DEFAULT 0,

    completed_events INTEGER
        DEFAULT 0,

    total_volunteers INTEGER
        DEFAULT 0,

    active_volunteers INTEGER
        DEFAULT 0,

    total_hours_logged NUMERIC(10,2)
        DEFAULT 0.00,

    last_updated TIMESTAMP WITH TIME ZONE
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

CREATE INDEX idx_audit_logs_record
    ON audit_logs(record_id);

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

-- REFRESH VOLUNTEER STATS CACHE
CREATE OR REPLACE FUNCTION update_volunteer_stats_cache()
RETURNS TRIGGER AS
$$
DECLARE
    target_volunteer UUID;
BEGIN

    IF TG_OP = 'DELETE' THEN
        target_volunteer := OLD.volunteer_id;
    ELSE
        target_volunteer := NEW.volunteer_id;
    END IF;

    INSERT INTO volunteer_stats_cache
    (
        volunteer_id,
        total_hours_logged,
        total_activities_attended,
        last_updated
    )

    SELECT
        target_volunteer,
        COALESCE(SUM(hours_logged),0),
        COUNT(attendance_id)
            FILTER (WHERE status='present'),
        CURRENT_TIMESTAMP

    FROM attendance
    WHERE volunteer_id = target_volunteer

    ON CONFLICT (volunteer_id)
    DO UPDATE
    SET
        total_hours_logged = EXCLUDED.total_hours_logged,
        total_activities_attended = EXCLUDED.total_activities_attended,
        last_updated = EXCLUDED.last_updated;

    RETURN NULL;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER refresh_volunteer_cache
AFTER INSERT OR UPDATE OR DELETE
ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_volunteer_stats_cache();

-- AUTO CLOSE EVENT REGISTRATION
CREATE OR REPLACE FUNCTION enforce_auto_close_registration()
RETURNS TRIGGER AS
$$
DECLARE
    current_count INTEGER;
    maximum_capacity INTEGER;
    auto_close BOOLEAN;
BEGIN

    SELECT
        max_volunteers,
        auto_close_registration
    INTO
        maximum_capacity,
        auto_close
    FROM events
    WHERE event_id = NEW.event_id;

    IF auto_close IS DISTINCT FROM TRUE THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO current_count
    FROM attendance
    WHERE event_id = NEW.event_id
      AND status IN ('registered','present');

    IF maximum_capacity IS NOT NULL
       AND current_count >= maximum_capacity THEN

        UPDATE events
        SET
            registration_open = FALSE,
            status = 'registration_closed'
        WHERE event_id = NEW.event_id;

        INSERT INTO event_timeline
        (
            event_id,
            action
        )
        VALUES
        (
            NEW.event_id,
            'Registration automatically closed (Capacity Reached)'
        );

    END IF;

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_close_registration
AFTER INSERT
ON attendance
FOR EACH ROW
WHEN (NEW.status = 'registered')
EXECUTE FUNCTION enforce_auto_close_registration();

-- REFRESH ADMIN DASHBOARD CACHE
CREATE OR REPLACE FUNCTION refresh_admin_dashboard_cache()
RETURNS TRIGGER AS
$$
BEGIN

    INSERT INTO admin_dashboard_cache
    (
        id,
        total_events,
        upcoming_events,
        ongoing_events,
        completed_events,
        total_volunteers,
        active_volunteers,
        total_hours_logged,
        last_updated
    )

    VALUES
    (
        1,

        (
            SELECT COUNT(*)
            FROM events
            WHERE is_deleted = FALSE
        ),

        (
            SELECT COUNT(*)
            FROM events
            WHERE status = 'upcoming'
            AND is_deleted = FALSE
        ),

        (
            SELECT COUNT(*)
            FROM events
            WHERE status = 'ongoing'
            AND is_deleted = FALSE
        ),

        (
            SELECT COUNT(*)
            FROM events
            WHERE status = 'completed'
            AND is_deleted = FALSE
        ),

        (
            SELECT COUNT(*)
            FROM users
            WHERE role = 'volunteer'
        ),

        (
            SELECT COUNT(*)
            FROM users
            WHERE role = 'volunteer'
            AND is_active = TRUE
        ),

        (
            SELECT COALESCE(SUM(hours_logged),0)
            FROM attendance
        ),

        CURRENT_TIMESTAMP
    )

    ON CONFLICT (id)
    DO UPDATE
    SET
        total_events = EXCLUDED.total_events,
        upcoming_events = EXCLUDED.upcoming_events,
        ongoing_events = EXCLUDED.ongoing_events,
        completed_events = EXCLUDED.completed_events,
        total_volunteers = EXCLUDED.total_volunteers,
        active_volunteers = EXCLUDED.active_volunteers,
        total_hours_logged = EXCLUDED.total_hours_logged,
        last_updated = EXCLUDED.last_updated;

    RETURN NULL;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trigger_dashboard_events
AFTER INSERT OR UPDATE OR DELETE
ON events
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_dashboard_cache();

CREATE TRIGGER trigger_dashboard_users
AFTER INSERT OR UPDATE OR DELETE
ON users
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_dashboard_cache();

CREATE TRIGGER trigger_dashboard_attendance
AFTER INSERT OR UPDATE OR DELETE
ON attendance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_dashboard_cache();

-- AUDIT FUNCTION
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS
$$
BEGIN

    IF TG_OP = 'INSERT' THEN

        INSERT INTO audit_logs
        (
            action,
            table_name,
            record_id,
            new_values,
            timestamp
        )
        VALUES
        (
            TG_OP,
            TG_TABLE_NAME,
            (to_jsonb(NEW)->>TG_ARGV[0])::UUID,
            to_jsonb(NEW),
            CURRENT_TIMESTAMP
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN

        INSERT INTO audit_logs
        (
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            timestamp
        )
        VALUES
        (
            TG_OP,
            TG_TABLE_NAME,
            (to_jsonb(NEW)->>TG_ARGV[0])::UUID,
            to_jsonb(OLD),
            to_jsonb(NEW),
            CURRENT_TIMESTAMP
        );

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        INSERT INTO audit_logs
        (
            action,
            table_name,
            record_id,
            old_values,
            timestamp
        )
        VALUES
        (
            TG_OP,
            TG_TABLE_NAME,
            (to_jsonb(OLD)->>TG_ARGV[0])::UUID,
            to_jsonb(OLD),
            CURRENT_TIMESTAMP
        );

        RETURN OLD;

    END IF;

    RETURN NULL;
END;
$$
LANGUAGE plpgsql;

-- AUDIT TRIGGERS
CREATE TRIGGER audit_users
AFTER INSERT OR UPDATE OR DELETE
ON users
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('user_id');

CREATE TRIGGER audit_events
AFTER INSERT OR UPDATE OR DELETE
ON events
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('event_id');

CREATE TRIGGER audit_attendance
AFTER INSERT OR UPDATE OR DELETE
ON attendance
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('attendance_id');

-- =====================================================
-- END OF SCHEMA
-- =====================================================