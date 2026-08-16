const db = require('../config/db');

const AdminTaskModel = {
    /**
     * Create a new task and log it in the timeline
     */
    createTask: async (taskData, adminId) => {
        const { event_id, assigned_to, title, description, deadline, is_public } = taskData;
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');

            const insertQuery = `
                INSERT INTO tasks (
                    event_id, created_by, assigned_to, title, description, deadline, is_public
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const values = [
                event_id || null, adminId, assigned_to, title.trim(), 
                description?.trim() || null, deadline || null, is_public !== false
            ];

            const { rows } = await client.query(insertQuery, values);
            const newTask = rows[0];

            await client.query(
                `INSERT INTO task_timeline (task_id, user_id, action) VALUES ($1, $2, $3)`,
                [newTask.task_id, adminId, 'Task created and assigned']
            );

            await client.query('COMMIT');
            return newTask;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Update task details (title, desc, deadline, etc.)
     */
    updateTask: async (taskId, updateData, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            const taskCheck = await client.query(`SELECT status FROM tasks WHERE task_id = $1 AND is_deleted = FALSE`, [taskId]);
            if (taskCheck.rows.length === 0) throw new Error("TASK_NOT_FOUND");
            if (taskCheck.rows[0].status === 'completed' || taskCheck.rows[0].status === 'cancelled') {
                throw new Error("INVALID_TASK_STATUS");
            }

            const setClauses = [];
            const values = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updateData)) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }

            if (setClauses.length === 0) throw new Error("NO_DATA_PROVIDED");
            values.push(taskId);

            const updateQuery = `
                UPDATE tasks SET ${setClauses.join(", ")} 
                WHERE task_id = $${paramIndex} RETURNING *;
            `;
            const { rows } = await client.query(updateQuery, values);

            await client.query(
                `INSERT INTO task_timeline (task_id, user_id, action) VALUES ($1, $2, $3)`,
                [taskId, adminId, 'Task details updated by Admin']
            );

            await client.query("COMMIT");
            return rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Update Task Status & Remarks (Verify / Cancel)
     */
    updateTaskStatus: async (taskId, status, admin_remarks, adminId) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            const { rows } = await client.query(
                `UPDATE tasks SET status = $1, admin_remarks = COALESCE($2, admin_remarks)
                 WHERE task_id = $3 AND is_deleted = FALSE RETURNING *`,
                [status, admin_remarks || null, taskId]
            );

            if (rows.length === 0) throw new Error("TASK_NOT_FOUND");

            await client.query(
                `INSERT INTO task_timeline (task_id, user_id, action) VALUES ($1, $2, $3)`,
                [taskId, adminId, `Task status changed to ${status}`]
            );

            await client.query("COMMIT");
            return rows[0];
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Soft Delete a task
     */
    deleteTask: async (taskId, adminId) => {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                `UPDATE tasks SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2, status = 'cancelled'
                 WHERE task_id = $1 AND is_deleted = FALSE RETURNING *`,
                [taskId, adminId]
            );

            if (rows.length === 0) throw new Error("TASK_NOT_FOUND");

            await client.query(
                `INSERT INTO task_timeline (task_id, user_id, action) VALUES ($1, $2, $3)`,
                [taskId, adminId, 'Task soft-deleted by Admin']
            );

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    getAllTasks: async (filters = {}) => {
        const { event_id, status, assigned_to, limit = 50, offset = 0 } = filters;
        let queryParams = [];
        let whereClauses = ['t.is_deleted = FALSE'];

        if (event_id) { queryParams.push(event_id); whereClauses.push(`t.event_id = $${queryParams.length}`); }
        if (status) { queryParams.push(status); whereClauses.push(`t.status = $${queryParams.length}`); }
        if (assigned_to) { queryParams.push(assigned_to); whereClauses.push(`t.assigned_to = $${queryParams.length}`); }

        const baseQuery = `
            SELECT 
                t.*,
                u.first_name AS assignee_first, u.last_name AS assignee_last,
                e.title AS event_title,
                COUNT(*) OVER()::integer AS full_count
            FROM tasks t
            JOIN users u ON t.assigned_to = u.user_id
            LEFT JOIN events e ON t.event_id = e.event_id
            ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
            ORDER BY t.created_at DESC
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `;

        queryParams.push(parseInt(limit, 10));
        queryParams.push(parseInt(offset, 10));

        const { rows } = await db.query(baseQuery, queryParams);
        const totalCount = rows.length > 0 ? rows[0].full_count : 0;
        const cleanedRows = rows.map(({ full_count, ...rest }) => rest);

        return { data: cleanedRows, totalCount };
    },

    getTaskDetails: async (taskId) => {
        const taskQuery = `
            SELECT t.*, u.first_name AS assignee_first, u.last_name AS assignee_last, e.title AS event_title
            FROM tasks t JOIN users u ON t.assigned_to = u.user_id LEFT JOIN events e ON t.event_id = e.event_id
            WHERE t.task_id = $1 AND t.is_deleted = FALSE
        `;
        const { rows } = await db.query(taskQuery, [taskId]);
        if (rows.length === 0) return null;

        const timelineQuery = `
            SELECT tl.action, tl.timestamp, u.first_name, u.last_name 
            FROM task_timeline tl LEFT JOIN users u ON tl.user_id = u.user_id 
            WHERE tl.task_id = $1 ORDER BY tl.timestamp DESC
        `;
        const timeline = await db.query(timelineQuery, [taskId]);
        rows[0].timeline = timeline.rows;

        return rows[0];
    }
};

module.exports = AdminTaskModel;