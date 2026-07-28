const jwt = require('jsonwebtoken');
const db = require('../config/db');
const AdminEventModel = require('../models/adminEventModel');

const AdminEventController = {

    /**
     * Create an event with inline business validation rules
     */
    createNewSystemEvent: async (req, res) => {
        try {
            const {
                title,
                event_date,
                start_time,
                end_time,
                location_name,
                location_address,
                volunteers_needed,
                min_volunteers,
                max_volunteers,
                registration_deadline
            } = req.body;

            const adminId = req.user.userId;

            if (
                !title ||
                !event_date ||
                !start_time ||
                !end_time ||
                !location_name ||
                !location_address ||
                !volunteers_needed
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Required fields are missing."
                });
            }

            const eventDate = new Date(event_date);
            const today = new Date();
            today.setHours(0,0,0,0);

            if (eventDate < today) {
                return res.status(400).json({
                    success:false,
                    message:"Event date cannot be in the past."
                });
            }

            if (start_time >= end_time) {
                return res.status(400).json({
                    success:false,
                    message:"End time must be after start time."
                });
            }

            if (registration_deadline) {
                const eventStart = new Date(`${event_date}T${start_time}`);
                const deadline = new Date(registration_deadline);
                if (deadline >= eventStart) {
                    return res.status(400).json({
                        success:false,
                        message:"Registration deadline must be before event start time."
                    });
                }
            }

            const min = Number(min_volunteers || 1);
            const needed = Number(volunteers_needed);
            const max = Number(max_volunteers || volunteers_needed);
            
            if (
                min <= 0 ||
                needed <= 0 ||
                max <= 0
            ) {
                return res.status(400).json({
                    success:false,
                    message:"Volunteer counts must be greater than zero."
                });
            }

            if (min > max) {
                return res.status(400).json({
                    success:false,
                    message:"Minimum volunteers cannot exceed maximum volunteers."
                });
            }

            if (needed > max) {
                return res.status(400).json({
                    success:false,
                    message:"Volunteers needed cannot exceed maximum volunteers."
                });
            }

            if (min > needed) {
                return res.status(400).json({
                    success:false,
                    message:"Minimum volunteers cannot exceed volunteers needed."
                });
            }

            const payload = {
                ...req.body,
                volunteers_needed: needed,
                min_volunteers: min,
                max_volunteers: max
            };

            const newEvent = await AdminEventModel.createEvent(payload, adminId);
            return res.status(201).json({ success: true, message: 'Event created successfully.', data: newEvent });
        } catch (error) {
            console.error('[Event Creation Subsystem Error]:', error);
            return res.status(500).json({ success: false, message: 'Data transaction abort caused by backend validation collapse.' });
        }
    },

    /**
     * Publish Event
     */
    publishSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const event = await AdminEventModel.publishEvent(
                id,
                adminId
            );
            return res.status(200).json({
                success: true,
                message: "Event published successfully.",
                data: event
            });
        } catch (err) {
            if (err.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }
            if (err.message === "INVALID_EVENT_STATUS") {
                return res.status(400).json({
                    success: false,
                    message: "Only Draft events can be published."
                });
            }
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Failed to publish event."
            });
        }
    },

    /**
     * Complete an Event
     */
    completeSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const event = await AdminEventModel.completeEvent(
                id,
                adminId
            );
            return res.status(200).json({
                success: true,
                message: "Event completed successfully.",
                data: event
            });
        } catch (error) {
            if (error.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }
            if (error.message === "INVALID_EVENT_STATUS") {
                return res.status(400).json({
                    success: false,
                    message: "Only published events can be completed."
                });
            }
            if (error.message === "EVENT_NOT_FINISHED") {
                return res.status(400).json({
                    success: false,
                    message: "The event cannot be completed before its scheduled end time."
                });
            }
            console.error("[Complete Event Error]:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to complete event."
            });
        }
    },

    /**
     * Cancel an Event
     */
    cancelSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const event = await AdminEventModel.cancelEvent(
                id,
                adminId
            );
            return res.status(200).json({
                success: true,
                message: "Event cancelled successfully.",
                data: event
            });
        } catch (error) {
            if (error.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }
            if (error.message === "INVALID_EVENT_STATUS") {
                return res.status(400).json({
                    success: false,
                    message: "Only Draft or Published events can be cancelled."
                });
            }
            console.error("[Cancel Event Error]:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to cancel event."
            });
        }
    },

    /**
    * Archive an Event
    */
    archiveSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const event = await AdminEventModel.archiveEvent(
                id,
                adminId
            );
            return res.status(200).json({
                success: true,
                message: "Event archived successfully.",
                data: event
            });
        } catch (error) {
            if (error.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }
            if (error.message === "INVALID_EVENT_STATUS") {
                return res.status(400).json({
                    success: false,
                    message: "Only completed or cancelled events can be archived."
                });
            }
            console.error("[Archive Event Error]:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to archive event."
            });
        }
    },

    /**
     * Generate Attendance QR Code
     */
    generateDynamicQRToken: async (req, res) => {
        try{
            const { eventId } = req.params;
            const adminId = req.user.userId;
            const qr =
                await AdminEventModel.generateQRCode(
                    eventId,
                    adminId
                );
            return res.status(200).json({
                success:true,
                data:qr
            });
        }
        catch(error){

            console.error(
                "[Generate QR Error]",
                error
            );

            return res.status(400).json({
                success:false,
                message:error.message
            });
        }
    },

        /**
    * Generates a short-lived Checkout QR token
    * Route: GET /api/admin/events/:eventId/checkout-qr
    */
    generateCheckoutQRToken: async (req, res) => {
        try {
            const { eventId } = req.params;
            const eventResult = await db.query(
                `
                SELECT
                    TO_CHAR(event_date,'YYYY-MM-DD') AS event_date,
                    start_time,
                    end_time,
                    status
                FROM events
                WHERE event_id=$1
                AND is_deleted=FALSE
                `,
                [eventId]
            );
            if (eventResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }
            const event = eventResult.rows[0];

            if (event.status !== "published") {
                return res.status(400).json({
                    success: false,
                    message: "Checkout QR can only be generated for published events."
                });
            }

            const now = new Date();
            const eventStart = new Date(
                `${event.event_date}T${event.start_time}`
            );
            const eventEnd = new Date(
                `${event.event_date}T${event.end_time}`
            );
            if (now < eventStart) {
                return res.status(403).json({
                    success: false,
                    message: "Checkout is not available before the event starts."
                });
            }

            if (now > eventEnd) {
                return res.status(403).json({
                    success: false,
                    message: "Checkout QR is no longer available because the event has ended."
                });
            }
            const token = jwt.sign(
                {
                    eventId,
                    action: "checkout",
                    nonce: Math.random().toString(36).substring(2, 15)
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30s"
                }
            );
            return res.status(200).json({
                success: true,
                data: {
                    token,
                    refreshIntervalMs: 25000
                }
            });
        }
        catch (error) {
            console.error("[Checkout QR Error]", error);
            return res.status(500).json({
                success: false,
                message: "Failed to generate checkout QR."
            });
        }
    },
        

    //===============================================================//


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
            const restrictedFields = ['event_id', 'created_by', 'created_at', 'updated_at', 'status'];
            const updates = { ...req.body };
            restrictedFields.forEach(field => delete updates[field]);

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No fields provided for update."
                });
            }

            ///////////////////

            const updatedEvent = await AdminEventModel.updateEvent(id, updates, adminId);
            if (!updatedEvent) {
                return res.status(404).json({ success: false, message: 'Target event reference lookup resolved to zero entries.' });
            }

            return res.status(200).json({ success: true, message: 'Operational adjustments applied successfully.', data: updatedEvent });
        } catch (error) {
            if (error.message === "EVENT_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }
            if (error.message === "EVENT_ARCHIVED") {
                return res.status(400).json({
                    success: false,
                    message: "Archived events cannot be modified."
                });
            }
            console.error("[Event Modification Failure]:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error."
            });
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
    }
};

module.exports = AdminEventController;