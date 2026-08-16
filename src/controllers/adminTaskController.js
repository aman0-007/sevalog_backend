const AdminTaskModel = require('../models/adminTaskModel');

const AdminTaskController = {

    createNewTask: async (req, res) => {
        try {
            const { title, assigned_to, deadline } = req.body;
            const adminId = req.user.userId;

            if (!title || !assigned_to) {
                return res.status(400).json({ success: false, message: "Title and Assignee are required." });
            }

            if (deadline && new Date(deadline) < new Date()) {
                return res.status(400).json({ success: false, message: "Deadline cannot be in the past." });
            }

            const newTask = await AdminTaskModel.createTask(req.body, adminId);
            return res.status(201).json({ success: true, message: 'Task created successfully.', data: newTask });
        } catch (error) {
            console.error('[Create Task Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to create task.' });
        }
    },

    updateTaskDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            
            const allowedFields = ['title', 'description', 'deadline', 'assigned_to', 'is_public'];
            const updateData = {};
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) updateData[key] = req.body[key];
            });

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
            }

            const updatedTask = await AdminTaskModel.updateTask(id, updateData, adminId);
            return res.status(200).json({ success: true, message: 'Task updated successfully.', data: updatedTask });
        } catch (error) {
            if (error.message === "TASK_NOT_FOUND") return res.status(404).json({ success: false, message: "Task not found." });
            if (error.message === "INVALID_TASK_STATUS") return res.status(400).json({ success: false, message: "Cannot edit completed or cancelled tasks." });
            if (error.message === "UNAUTHORIZED_ADMIN") return res.status(403).json({ success: false, message: "Access Denied: Only the creator of this task can modify or verify it." });
            console.error('[Update Task Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to update task.' });
        }
    },

    changeTaskStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const { status, admin_remarks } = req.body;

            const validStatuses = ['assigned', 'in_progress', 'pending_verification', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status." });
            }

            const updatedTask = await AdminTaskModel.updateTaskStatus(id, status, admin_remarks, adminId);
            return res.status(200).json({ success: true, message: `Task marked as ${status}.`, data: updatedTask });
        } catch (error) {
            if (error.message === "TASK_NOT_FOUND") return res.status(404).json({ success: false, message: "Task not found." });
            if (error.message === "UNAUTHORIZED_ADMIN") return res.status(403).json({ success: false, message: "Access Denied: Only the creator of this task can modify or verify it." });
            console.error('[Task Status Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to change task status.' });
        }
    },

    deleteTask: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            await AdminTaskModel.deleteTask(id, adminId);
            return res.status(200).json({ success: true, message: 'Task deleted successfully.' });
        } catch (error) {
            if (error.message === "TASK_NOT_FOUND") return res.status(404).json({ success: false, message: "Task not found." });
            if (error.message === "UNAUTHORIZED_ADMIN") return res.status(403).json({ success: false, message: "Access Denied: Only the creator of this task can modify or verify it." });
            console.error('[Delete Task Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete task.' });
        }
    },

    updateMyProgress: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const { status, volunteer_remarks } = req.body;

            if (!['in_progress', 'pending_verification'].includes(status)) {
                return res.status(400).json({ success: false, message: "You can only mark tasks as 'in_progress' or 'pending_verification'." });
            }

            const updatedTask = await AdminTaskModel.adminUpdateTaskProgress(id, adminId, status, volunteer_remarks);
            return res.status(200).json({ success: true, message: 'Progress updated successfully.', data: updatedTask });
        } catch (error) {
            if (error.message === "TASK_NOT_FOUND") return res.status(404).json({ success: false, message: "Task not found." });
            if (error.message === "UNAUTHORIZED_ASSIGNEE") return res.status(403).json({ success: false, message: "Only the assigned user can update task progress." });
            if (error.message === "TASK_FROZEN") return res.status(400).json({ success: false, message: "Task is already closed." });
            
            console.error('[Admin Assignee Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to update progress.' });
        }
    },

    listTasks: async (req, res) => {
        try {
            const filters = {
                event_id: req.query.event_id,
                status: req.query.status,
                assigned_to: req.query.assigned_to,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };
            const result = await AdminTaskModel.getAllTasks(filters);
            return res.status(200).json({ success: true, data: result.data, pagination: { totalRecords: result.totalCount } });
        } catch (error) {
            console.error('[List Tasks Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to list tasks.' });
        }
    },

    getTaskDetails: async (req, res) => {
        try {
            const task = await AdminTaskModel.getTaskDetails(req.params.id);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
            return res.status(200).json({ success: true, data: task });
        } catch (error) {
            console.error('[Get Task Details Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch task details.' });
        }
    }
};

module.exports = AdminTaskController;