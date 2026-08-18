const db = require('../config/db');

const VolunteerTaskModel = {
    getVolunteerTasks: async (userId, filters = {}) => {
        const { limit = 50, offset = 0 } = filters;
        
        const queryText = `
            SELECT 
                t.*, 
                e.title AS event_title, 
                u.first_name AS creator_first, u.last_name AS creator_last,
                a.first_name AS assignee_first, a.last_name AS assignee_last
            FROM tasks t
            LEFT JOIN events e ON t.event_id = e.event_id
            JOIN users u ON t.created_by = u.user_id
            LEFT JOIN users a ON t.assigned_to = a.user_id
            WHERE t.is_deleted = FALSE AND (t.assigned_to = $1 OR t.is_public = TRUE)
            ORDER BY 
                CASE WHEN t.assigned_to = $1 THEN 1 ELSE 2 END,
                t.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await db.query(queryText, [userId, limit, offset]);
        return rows;
    },

    updateTaskProgress: async (taskId, userId, status, volunteer_remarks) => {
        const client = await db.connect();
        try {
            await client.query("BEGIN");

            // SECURITY: Ensure the task belongs to THIS volunteer
            const checkTask = await client.query(`SELECT assigned_to, status FROM tasks WHERE task_id = $1 AND is_deleted = FALSE FOR UPDATE`, [taskId]);
            
            if (checkTask.rows.length === 0) throw new Error("TASK_NOT_FOUND");
            if (checkTask.rows[0].assigned_to !== userId) throw new Error("UNAUTHORIZED_TASK");
            if (['completed', 'cancelled'].includes(checkTask.rows[0].status)) throw new Error("TASK_FROZEN");

            const { rows } = await client.query(
                `UPDATE tasks SET status = $1, volunteer_remarks = $2, updated_at = NOW() 
                 WHERE task_id = $3 RETURNING *`,
                [status, volunteer_remarks || null, taskId]
            );

            await client.query(
                `INSERT INTO task_timeline (task_id, user_id, action) VALUES ($1, $2, $3)`,
                [taskId, userId, `Volunteer updated status to ${status}`]
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

    getTaskDetails: async (taskId, userId) => {
        // Fetch task details, ensuring the volunteer is either assigned to it or it's public
        const taskQuery = `
            SELECT t.*, 
                   e.title AS event_title, 
                   u.first_name AS creator_first, u.last_name AS creator_last,
                   a.first_name AS assignee_first, a.last_name AS assignee_last
            FROM tasks t 
            JOIN users u ON t.created_by = u.user_id 
            LEFT JOIN users a ON t.assigned_to = a.user_id 
            LEFT JOIN events e ON t.event_id = e.event_id
            WHERE t.task_id = $1 AND t.is_deleted = FALSE 
              AND (t.assigned_to = $2 OR t.is_public = TRUE)
        `;
        const { rows } = await db.query(taskQuery, [taskId, userId]);
        if (rows.length === 0) return null;

        // Fetch the activity timeline so the volunteer can see the history
        const timelineQuery = `
            SELECT tl.action, tl.timestamp, u.first_name, u.last_name 
            FROM task_timeline tl 
            LEFT JOIN users u ON tl.user_id = u.user_id 
            WHERE tl.task_id = $1 ORDER BY tl.timestamp DESC
        `;
        const timeline = await db.query(timelineQuery, [taskId]);
        rows[0].timeline = timeline.rows;

        return rows[0];
    }
};

module.exports = VolunteerTaskModel;