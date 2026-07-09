const AdminModel = require('../models/adminModel');

const adminController = {
    /**
     * Handler to publish a new activity
     */
    createNewEvent: async (req, res, next) => {
        try {
            const adminId = req.user.userId;

            if (!adminId) {
                return res.status(403).json({ error: 'Access Denied: Admin authorization identity required.' });
            }

            const newEvent = await AdminModel.createEvent(adminId, req.body);
            res.status(201).json({
                message: 'Seva Event published successfully.',
                data: newEvent
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Handler to view all Seva events/activities
     */
    getAllEvents: async (req, res, next) => {
        try {
            const events = await AdminModel.getAllEventsAdmin();
            res.status(200).json({ data: events });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Handler to compile a complete overview for a single event
     */
    getEventReport: async (req, res, next) => {
        try {
            const { eventId } = req.params;

            if (!eventId) {
                return res.status(400).json({ error: 'Event identity parameter is required.' });
            }

            const report = await AdminModel.getEventDetailsReport(eventId);
            
            if (!report) {
                return res.status(404).json({ error: 'Requested seva event record could not be found.' });
            }

            res.status(200).json({ data: report });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Handler for summary calculations displayed on admin dashboard load
     */
    getSamithiOverview: async (req, res, next) => {
        try {
            const overviewStats = await AdminModel.getGlobalSamithiStats();
            res.status(200).json({ data: overviewStats });
        } catch (error) {
            next(error);
        }
    },
    
    /**
     * Handler for marking attendance after an event
     */
    logVolunteerAttendance: async (req, res, next) => {
        try {
            const adminId = req.user.userId; // Securely pulled from the JWT token
            const { eventId } = req.params;
            const { volunteerId, status, hoursLogged } = req.body;

            // 1. Basic Input Validation
            if (!volunteerId || !status) {
                return res.status(400).json({ error: 'Volunteer ID and attendance status are required.' });
            }

            if (status !== 'present' && status !== 'absent') {
                return res.status(400).json({ error: 'Status must be strictly "present" or "absent".' });
            }

            // 2. Execute the Database Upsert
            const attendanceRecord = await AdminModel.markAttendance(
                eventId, 
                volunteerId, 
                adminId, 
                status, 
                hoursLogged || 0
            );

            res.status(200).json({
                message: `Attendance marked as ${status} successfully.`,
                data: attendanceRecord
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = adminController;