-- ============================================================
-- CHEMBUR SAMITHI SEVA MANAGEMENT SYSTEM
-- COMPLETE DATABASE SCHEMA
-- PART 1 OF 4
--
-- Contains:
-- 1. Database Creation
-- 2. ENUM Types
-- 3. Users Table
-- 4. Events Table
-- ============================================================


-- ============================================================
-- 1. CREATE DATABASE
-- ============================================================

CREATE DATABASE chembur_samithi_seva;

-- Connect to the database

\c chembur_samithi_seva;


-- ============================================================
-- REQUIRED EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. CREATE CUSTOM ENUM TYPES
-- ============================================================

-- ------------------------------------------------------------
-- User Roles
-- ------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'admin',
    'volunteer'
);

-- ------------------------------------------------------------
-- Attendance Status
-- ------------------------------------------------------------
CREATE TYPE attendance_status AS ENUM (
    'registered',
    'withdrawn',
    'present',
    'absent',
    'waitlisted',
    'late',
    'excused'
);

-- ------------------------------------------------------------
-- Blood Groups
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Event Lifecycle Status
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Event Priority
-- ------------------------------------------------------------
CREATE TYPE event_priority_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- ------------------------------------------------------------
-- Event Visibility
-- ------------------------------------------------------------
CREATE TYPE event_visibility_level AS ENUM (
    'public',
    'members_only',
    'admin_only'
);

-- ------------------------------------------------------------
-- Notification Type
-- ------------------------------------------------------------
CREATE TYPE notification_type_enum AS ENUM (
    'email',
    'sms',
    'push',
    'in_app'
);

-- ------------------------------------------------------------
-- Notification Status
-- ------------------------------------------------------------
CREATE TYPE notification_status_enum AS ENUM (
    'pending',
    'sent',
    'failed',
    'read'
);


-- ============================================================
-- 3. USERS TABLE
-- ============================================================

CREATE TABLE users (
    -- Primary Key
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User Role
    role user_role NOT NULL DEFAULT 'volunteer',

    -- Personal Information
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,

    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group blood_group_type,

    -- Address Information
    residential_address TEXT,
    city VARCHAR(100) DEFAULT 'Mumbai',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(10),

    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_relation VARCHAR(50),
    emergency_contact_number VARCHAR(20),
    medical_conditions TEXT,

    -- Educational / Professional Information
    education_level VARCHAR(100),
    profession_or_college VARCHAR(150),
    skills TEXT[],
    languages_spoken TEXT[],
    interested_activities TEXT[],

    -- System Information
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    -- Soft Delete Support
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id)
);


-- ============================================================
-- 4. EVENTS TABLE
-- ============================================================

CREATE TABLE events (
    -- Primary Key
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Creator
    created_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    -- Basic Event Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Event Lifecycle
    status event_lifecycle_status
        DEFAULT 'draft',
    priority event_priority_level
        DEFAULT 'medium',
    visibility event_visibility_level
        DEFAULT 'public',

    -- Date & Time
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Registration

    registration_deadline TIMESTAMP WITH TIME ZONE,
    registration_open BOOLEAN DEFAULT FALSE,
    volunteers_needed INTEGER NOT NULL
        CHECK (volunteers_needed > 0),
    min_volunteers INTEGER DEFAULT 1,
    max_volunteers INTEGER,
    waitlist_enabled BOOLEAN DEFAULT FALSE,
    auto_close_registration BOOLEAN DEFAULT TRUE,

    -- Recurring Events

    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    recurrence_end_date DATE,

    -- Event Location

    location_name VARCHAR(150) NOT NULL,
    location_address TEXT NOT NULL,
    google_maps_link VARCHAR(255),

    -- Contact Information

    contact_person_name VARCHAR(100),
    contact_person_phone VARCHAR(20),

    -- Banner & Appearance

    banner_image_url TEXT,
    event_color VARCHAR(7)
        DEFAULT '#3B82F6',
    qr_code_token VARCHAR(255) UNIQUE,
    qr_expiry TIMESTAMP WITH TIME ZONE,

    -- Soft Delete

    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
        REFERENCES users(user_id),

    -- Audit Information

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    -- Constraints

    CONSTRAINT chk_time_order
        CHECK (end_time > start_time)
);


-- ============================================================
-- PART 2 OF 4
--
-- Contains:
-- 5. Attendance Table
-- 6. Event Gallery
-- 7. Event Documents
-- 8. Event Organizers
-- 9. Skills
-- 10. User Skills
-- 11. Event Required Skills
-- 12. Tags
-- 13. Event Tags
-- 14. Event Notes
-- 15. Event Feedback
-- ============================================================


-- ============================================================
-- 5. ATTENDANCE TABLE
-- ============================================================

CREATE TABLE attendance (
    -- Primary Key
    attendance_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- Foreign Keys
    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    volunteer_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    marked_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    -- Attendance Details
    status attendance_status NOT NULL,
    attendance_method VARCHAR(50)
        DEFAULT 'manual',
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    hours_logged NUMERIC(5,2)
        DEFAULT 0.00,
    feedback TEXT,
    admin_remarks TEXT,

    -- Audit Information
    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    -- Constraints

    CONSTRAINT unique_volunteer_per_event
        UNIQUE (event_id, volunteer_id),
    CONSTRAINT chk_checkout_after_checkin
        CHECK (
            check_out_time IS NULL
            OR check_in_time IS NULL
            OR check_out_time >= check_in_time
        )
);


-- ============================================================
-- 6. EVENT GALLERY
-- ============================================================

CREATE TABLE event_gallery (
    image_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 7. EVENT DOCUMENTS
-- ============================================================

CREATE TABLE event_documents (
    doc_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    doc_url TEXT NOT NULL,
    doc_type VARCHAR(50),
    uploaded_by UUID
        REFERENCES users(user_id)
        ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 8. EVENT ORGANIZERS
-- ============================================================

CREATE TABLE event_organizers (
    event_id UUID
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    role VARCHAR(100)
        DEFAULT 'coordinator',
    contact_override VARCHAR(20),
    PRIMARY KEY (event_id, user_id)
);


-- ============================================================
-- 9. SKILLS MASTER TABLE
-- ============================================================

CREATE TABLE skills (
    skill_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    name VARCHAR(100)
        UNIQUE
        NOT NULL
);


-- ============================================================
-- 10. USER SKILLS
-- ============================================================

CREATE TABLE user_skills (
    user_id UUID
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    skill_id UUID
        REFERENCES skills(skill_id)
        ON DELETE CASCADE,
    PRIMARY KEY (
        user_id,
        skill_id
    )
);


-- ============================================================
-- 11. EVENT REQUIRED SKILLS
-- ============================================================

CREATE TABLE event_required_skills (
    event_id UUID
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    skill_id UUID
        REFERENCES skills(skill_id)
        ON DELETE CASCADE,
    PRIMARY KEY (
        event_id,
        skill_id
    )
);


-- ============================================================
-- 12. TAGS MASTER TABLE
-- ============================================================

CREATE TABLE tags (
    tag_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    name VARCHAR(100)
        UNIQUE
        NOT NULL
);


-- ============================================================
-- 13. EVENT TAGS
-- ============================================================

CREATE TABLE event_tags (
    event_id UUID
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    tag_id UUID
        REFERENCES tags(tag_id)
        ON DELETE CASCADE,
    PRIMARY KEY (
        event_id,
        tag_id
    )
);


-- ============================================================
-- 14. EVENT NOTES
-- ============================================================

CREATE TABLE event_notes (
    note_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    admin_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 15. EVENT FEEDBACK
-- ============================================================

CREATE TABLE event_feedback (
    feedback_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL
        REFERENCES events(event_id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    rating INTEGER
        CHECK (
            rating BETWEEN 1 AND 5
        ),
    comments TEXT,
    internal_admin_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_feedback_per_user
        UNIQUE (
            event_id,
            user_id
        )
);

-- ============================================================
-- PART 3 OF 4
--
-- Contains:
-- 16. Event Timeline
-- 17. Audit Logs
-- 18. Notifications
-- 19. Volunteer Stats Cache
-- 20. Admin Dashboard Cache
-- 21. Indexes
-- 22. Views
-- ============================================================


-- ============================================================
-- 16. EVENT TIMELINE
-- ============================================================

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


-- ============================================================
-- 17. AUDIT LOGS
-- ============================================================

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


-- ============================================================
-- 18. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    type notification_type_enum NOT NULL,
    status notification_status_enum
        DEFAULT 'pending',
    title VARCHAR(255),
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 19. VOLUNTEER STATS CACHE
-- ============================================================

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


-- ============================================================
-- 20. ADMIN DASHBOARD CACHE
-- ============================================================

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


-- ============================================================
-- 21. PERFORMANCE INDEXES
-- ============================================================

-- ------------------------------------------------------------
-- EVENTS
-- ------------------------------------------------------------

CREATE INDEX idx_events_date
    ON events(event_date);

CREATE INDEX idx_events_status
    ON events(status);

CREATE INDEX idx_events_visibility
    ON events(visibility);

CREATE INDEX idx_events_is_deleted
    ON events(is_deleted);

-- ------------------------------------------------------------
-- ATTENDANCE
-- ------------------------------------------------------------

CREATE INDEX idx_attendance_event
    ON attendance(event_id);

CREATE INDEX idx_attendance_volunteer
    ON attendance(volunteer_id);

CREATE INDEX idx_attendance_status
    ON attendance(status);

-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------

CREATE INDEX idx_audit_logs_record
    ON audit_logs(record_id);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------

CREATE INDEX idx_notifications_recipient
    ON notifications(recipient_id);

-- ============================================================
-- 22. VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- Active Events View
-- ------------------------------------------------------------

CREATE VIEW active_events_view AS
SELECT
    e.*,
    COALESCE(
        (
            SELECT COUNT(*)
            FROM attendance a
            WHERE a.event_id = e.event_id
              AND a.status IN ('registered','present')
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

-- ------------------------------------------------------------
-- Volunteer Dashboard Statistics
-- ------------------------------------------------------------

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


-- ============================================================
-- PART 4 OF 4
--
-- Contains:
-- 23. Common Timestamp Function
-- 24. Timestamp Triggers
-- 25. Attendance Hours Automation
-- 26. Volunteer Cache Automation
-- 27. Registration Auto Close
-- 28. Triggers
-- ============================================================

-- ============================================================
-- 23. COMMON UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;


-- ============================================================
-- 24. TIMESTAMP TRIGGERS
-- ============================================================

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_timestamp_events
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();


-- ============================================================
-- 25. AUTOMATIC ATTENDANCE HOURS CALCULATION
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.check_in_time IS NOT NULL
       AND NEW.check_out_time IS NOT NULL THEN
        NEW.hours_logged := ROUND(
            (
                EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0
            )::numeric,
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


-- ============================================================
-- 26. VOLUNTEER CACHE REFRESH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_volunteer_stats_cache()
RETURNS TRIGGER AS
$$
DECLARE
    target_volunteer_id UUID;
BEGIN
    -- Determine affected volunteer
    IF TG_OP = 'DELETE' THEN
        target_volunteer_id := OLD.volunteer_id;
    ELSE
        target_volunteer_id := NEW.volunteer_id;
    END IF;

    -- Recalculate volunteer statistics
    INSERT INTO volunteer_stats_cache (
        volunteer_id,
        total_hours_logged,
        total_activities_attended,
        last_updated
    )
    SELECT
        target_volunteer_id,
        COALESCE(SUM(hours_logged), 0.00),
        COUNT(attendance_id) FILTER (WHERE status = 'present'),
        CURRENT_TIMESTAMP
    FROM attendance
    WHERE volunteer_id = target_volunteer_id
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

-- ============================================================
-- 27. AUTO CLOSE EVENT REGISTRATION
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_auto_close_registration()
RETURNS TRIGGER AS
$$
DECLARE
    current_count INTEGER;
    maximum_capacity INTEGER;
    auto_close BOOLEAN;
BEGIN
    -- Get Event Settings
    SELECT
        max_volunteers,
        auto_close_registration
    INTO
        maximum_capacity,
        auto_close
    FROM events
    WHERE event_id = NEW.event_id;

    -- Exit if feature disabled
    IF auto_close IS DISTINCT FROM TRUE THEN
        RETURN NEW;
    END IF;

    -- Count Registered Volunteers
    SELECT COUNT(*)
    INTO current_count
    FROM attendance
    WHERE event_id = NEW.event_id
      AND status IN ('registered', 'present');

    -- Close Registration
    IF maximum_capacity IS NOT NULL
       AND current_count >= maximum_capacity THEN

        UPDATE events
        SET
            registration_open = FALSE,
            status = 'registration_closed'
        WHERE event_id = NEW.event_id;

        -- Add Timeline Entry
        INSERT INTO event_timeline (
            event_id,
            action
        )
        VALUES (
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


-- ============================================================
-- PART 5 OF 5
--
-- Contains:
-- 29. Admin Dashboard Cache Automation
-- 30. Universal Audit Logging
-- ============================================================

-- ============================================================
-- 29. ADMIN DASHBOARD CACHE AUTO REFRESH
-- ============================================================

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

-- ============================================================
-- DASHBOARD CACHE TRIGGERS
-- ============================================================

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


-- ============================================================
-- 30. UNIVERSAL AUDIT LOG FUNCTION
-- ============================================================

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
            (
                to_jsonb(NEW)->>(
                    TG_ARGV[0]
                )
            )::uuid,
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
            (
                to_jsonb(NEW)->>(
                    TG_ARGV[0]
                )
            )::uuid,
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
            (
                to_jsonb(OLD)->>(
                    TG_ARGV[0]
                )
            )::uuid,
            to_jsonb(OLD),
            CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$
LANGUAGE plpgsql;

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

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

CREATE TRIGGER audit_skills
AFTER INSERT OR UPDATE OR DELETE
ON skills
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('skill_id');

CREATE TRIGGER audit_tags
AFTER INSERT OR UPDATE OR DELETE
ON tags
FOR EACH ROW
EXECUTE FUNCTION audit_trigger('tag_id');

-- ============================================================
-- END OF DATABASE SCHEMA
-- ============================================================