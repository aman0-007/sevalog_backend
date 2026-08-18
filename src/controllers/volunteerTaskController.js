const VolunteerTaskModel = require('../models/volunteerTaskModel');

const VolunteerTaskController = {
    listTasks: async (req, res) => {
        try {
            const userId = req.user.userId;
            const tasks = await VolunteerTaskModel.getVolunteerTasks(userId, req.query);
            return res.status(200).json({ success: true, data: tasks });
        } catch (error) {
            console.error('[Volunteer Task List Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve tasks.' });
        }
    },

    updateProgress: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { status, volunteer_remarks } = req.body;

            // Volunteers can only move it to in_progress or pending_verification
            if (!['in_progress', 'pending_verification'].includes(status)) {
                return res.status(400).json({ success: false, message: "Volunteers can only mark tasks as 'in_progress' or 'pending_verification'." });
            }

            const updatedTask = await VolunteerTaskModel.updateTaskProgress(id, userId, status, volunteer_remarks);
            return res.status(200).json({ success: true, message: 'Task updated successfully.', data: updatedTask });
        } catch (error) {
            if (error.message === "TASK_NOT_FOUND") return res.status(404).json({ success: false, message: "Task not found." });
            if (error.message === "UNAUTHORIZED_TASK") return res.status(403).json({ success: false, message: "You can only update tasks assigned to you." });
            if (error.message === "TASK_FROZEN") return res.status(400).json({ success: false, message: "This task is already closed by admin." });
            
            console.error('[Volunteer Task Update Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to update task progress.' });
        }
    },

    getTaskDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            const task = await VolunteerTaskModel.getTaskDetails(id, userId);
            
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found or access denied.' });
            }
            
            return res.status(200).json({ success: true, data: task });
        } catch (error) {
            console.error('[Volunteer Task Details Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve task details.' });
        }
    }
};

module.exports = VolunteerTaskController;