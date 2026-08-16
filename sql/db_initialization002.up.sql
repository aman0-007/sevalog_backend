-- =====================================================
-- UP SCRIPT: ADD TASK MANAGEMENT SYSTEM
-- =====================================================

-- Connect to the correct database first!
\c chembur_samithi_seva;

-- 1. Create the new lifecycle ENUM for tasks
CREATE TYPE task_status AS ENUM (
    'assigned',
    'in_progress',
    'pending_verification',
    'completed',
    'cancelled'
);

-- 2. Create the core Tasks table
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    event_id UUID 
        REFERENCES events(event_id) 
        ON DELETE CASCADE, -- If an event is deleted, its linked tasks are also deleted. Nullable for standalone tasks.
        
    created_by UUID 
        REFERENCES users(user_id) 
        ON DELETE SET NULL,
        
    assigned_to UUID NOT NULL 
        REFERENCES users(user_id) 
        ON DELETE CASCADE,

    -- Core Data
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    
    -- State & Configuration
    status task_status DEFAULT 'assigned',
    is_public BOOLEAN DEFAULT TRUE, -- TRUE = All volunteers can view. FALSE = Only Admin & Assignee can view.

    -- Communication
    volunteer_remarks TEXT,
    admin_remarks TEXT,

    -- Soft Deletion (Matching your existing architecture)
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the Task Timeline for Audit History
CREATE TABLE task_timeline (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id UUID NOT NULL 
        REFERENCES tasks(task_id) 
        ON DELETE CASCADE,

    user_id UUID 
        REFERENCES users(user_id) 
        ON DELETE SET NULL,

    action VARCHAR(255) NOT NULL,

    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Apply your EXISTING auto-update trigger to the new tasks table
CREATE TRIGGER set_timestamp_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 5. Create Indexes for fast querying on dashboards
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_visibility ON tasks(is_public);

-- =====================================================
-- END OF UP SCRIPT
-- =====================================================