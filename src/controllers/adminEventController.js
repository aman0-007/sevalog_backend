const jwt = require('jsonwebtoken');
const db = require('../config/db');
const AdminEventModel = require('../models/adminEventModel');

const AdminEventController = {
    /**
     * Retrieve global dashboard summary metrics cards safely
     */
    getDashboardMetrics: async (req, res) => {
        try {
            const data = await AdminEventModel.getMetrics();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('[Metrics Engine Error]:', error);
            return res.status(500).json({ success: false, message: 'Server error pulling structural cache records.' });
        }
    },

    /**
     * List all structural events matching query parameters
     */
    listAllAdminEvents: async (req, res) => {
        try {
            const filters = {
                search: req.query.search || null,
                location: req.query.location || null,
                category: req.query.category || null,
                status: req.query.status || null,
                sortBy: req.query.sortBy || 'created',
                sortOrder: req.query.sortOrder || 'DESC',
                limit: req.query.limit || 50,
                offset: req.query.offset || 0
            };

            const data = await AdminEventModel.getAllEvents(filters);
            return res.status(200).json({ success: true, count: data.length, data });
        } catch (error) {
            console.error('[Event Engine List Query Error]:', error);
            return res.status(500).json({ success: false, message: 'Structural processing failure during listing retrieval.' });
        }
    },

    /**
     * Create an event with inline business validation rules
     */
    createNewSystemEvent: async (req, res) => {
        try {
            const { title, event_date, start_time, end_time, location_name, location_address, volunteers_needed } = req.body;
            const adminId = req.user.userId; // Provided securely by identity verification guard middleware

            // Structural Validation Layer matching Database requirements
            if (!title || !event_date || !start_time || !end_time || !location_name || !location_address || !volunteers_needed) {
                return res.status(400).json({ success: false, message: 'All baseline execution fields are strictly required.' });
            }

            // Verify logical sequence parameters match timeline rules
            const incomingDate = new Date(event_date);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (incomingDate < today) {
                return res.status(400).json({ success: false, message: 'Operation aborted. Events cannot be initialized in past timelines.' });
            }

            if (start_time >= end_time) {
                return res.status(400).json({ success: false, message: 'Logical chronological mismatch: end_time must be after start_time.' });
            }

            const newEvent = await AdminEventModel.createEvent(req.body, adminId);
            return res.status(201).json({ success: true, message: 'System event initialized successfully.', data: newEvent });
        } catch (error) {
            console.error('[Event Creation Subsystem Error]:', error);
            return res.status(500).json({ success: false, message: 'Data transaction abort caused by backend validation collapse.' });
        }
    },

    /**
     * Fetch complete unified entity data matrix for the details modal view
     */
    getEventDetailSummary: async (req, res) => {
        try {
            const { id } = req.params;
            const eventDetails = await AdminEventModel.getEventDetails(id);
            
            if (!eventDetails) {
                return res.status(404).json({ success: false, message: 'The requested system entity does not exist or has been soft-deleted.' });
            }

            return res.status(200).json({ success: true, data: eventDetails });
        } catch (error) {
            console.error('[Details Modal Retrieval Crash]:', error);
            return res.status(500).json({ success: false, message: 'Unified data structural collapse during retrieval operation.' });
        }
    },

    /**
     * Update baseline attributes or trigger system configuration toggles
     */
    modifySystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            // Prevent critical database payload structure injection errors
            const restrictedFields = ['event_id', 'created_by', 'created_at', 'updated_at'];
            const updates = { ...req.body };
            restrictedFields.forEach(field => delete updates[field]);

            const updatedEvent = await AdminEventModel.updateEvent(id, updates, adminId);
            if (!updatedEvent) {
                return res.status(404).json({ success: false, message: 'Target event reference lookup resolved to zero entries.' });
            }

            return res.status(200).json({ success: true, message: 'Operational adjustments applied successfully.', data: updatedEvent });
        } catch (error) {
            console.error('[Event Modification Failure]:', error);
            return res.status(500).json({ success: false, message: 'Execution trace terminated: data integrity verification error.' });
        }
    },

    /**
     * Modify precise attendance record fields and trigger cache recalculation structures
     */
    updateRosterParticipation: async (req, res) => {
        try {
            const { attendanceId } = req.params;
            const { status, hours_logged, admin_remarks, check_in_time, check_out_time } = req.body;
            const adminId = req.user.userId;

            if (!status) {
                return res.status(400).json({ success: false, message: 'A targeted structural application state status must be supplied.' });
            }

            const updatedRecord = await AdminEventModel.updateAttendanceStatus(attendanceId, status, adminId, {
                hours_logged, admin_remarks, check_in_time, check_out_time
            });

            if (!updatedRecord) {
                return res.status(404).json({ success: false, message: 'Roster target index references mapping error.' });
            }

            return res.status(200).json({ success: true, message: 'Roster state entry modified cleanly.', data: updatedRecord });
        } catch (error) {
            console.error('[Roster Core Update Failure]:', error);
            return res.status(500).json({ success: false, message: 'Structural error altering internal attendance registries.' });
        }
    },

    /**
     * Safely soft-delete an event from the active roster
     */
    deleteSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            const deletedEvent = await AdminEventModel.deleteEvent(id, adminId);
            
            if (!deletedEvent) {
                return res.status(404).json({ success: false, message: 'Event not found or already deleted.' });
            }

            return res.status(200).json({ success: true, message: 'Event successfully removed from active system.' });
        } catch (error) {
            console.error('[Event Deletion Failure]:', error);
            return res.status(500).json({ success: false, message: 'Backend failure during deletion sequence.' });
        }
    },

    /**
     * Generates a short-lived token for dynamic QR rendering
     * Route: GET /api/admin/events/:eventId/qr-token
     */
    generateDynamicQRToken: async (req, res) => {
        try {
            const { eventId } = req.params;

            // 1. Fetch event details to validate timing and status
            const eventResult = await db.query(
                `SELECT TO_CHAR(event_date, 'YYYY-MM-DD') AS formatted_date, start_time, end_time, status 
                 FROM events 
                 WHERE event_id = $1`,
                [eventId]
            );

            if (eventResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Event not found.' });
            }

            const event = eventResult.rows[0];

            // 2. Hard block for cancelled or completed events
            if (event.status === 'cancelled' || event.status === 'completed') {
                return res.status(400).json({ 
                    success: false, 
                    message: `Cannot generate check-in QR code for a ${event.status} event.` 
                });
            }

            // 3. Time-window validation
            const now = new Date();
            
            // Format DB dates/times into usable JavaScript Date objects
            // Extract YYYY-MM-DD to avoid timezone shifting issues
            const eventStartTime = new Date(`${event.formatted_date}T${event.start_time}`);
            const eventEndTime = new Date(`${event.formatted_date}T${event.end_time}`);

            // Allowed generation starts 30 minutes before the start time
            const allowedStartTime = new Date(eventStartTime.getTime() - (30 * 60 * 1000));

            if (now < allowedStartTime) {
                const timeDiffMins = Math.ceil((allowedStartTime - now) / 60000);
                return res.status(403).json({ 
                    success: false, 
                    message: `Check-in opens 30 minutes before the event. Please wait ${timeDiffMins} more minutes.` 
                });
            }

            if (now > eventEndTime) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'This event has already ended. Check-ins are closed.' 
                });
            }

            // 4. Create a token that expires in exactly 30 seconds
            // We include a random nonce to ensure the hash (and resulting QR image) changes completely every time
            const token = jwt.sign(
                { 
                    eventId, 
                    nonce: Math.random().toString(36).substring(2, 15) 
                }, 
                process.env.JWT_SECRET, 
                { expiresIn: '30s' }
            );

            return res.status(200).json({ 
                success: true, 
                data: { 
                    token,
                    refreshIntervalMs: 25000 // Tell frontend to request a new token 5 seconds before this one expires
                }
            });

        } catch (error) {
            console.error('[Admin Generate QR Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to generate QR token.' });
        }
    }
};

module.exports = AdminEventController;