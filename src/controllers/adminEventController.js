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
     * Update Specific Event Details
     */
    updateSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            
            // Strict allowlist of fields that can be updated to prevent SQL injection or state hacking
            const allowedFields = [
                'title', 'description', 'category', 'event_date', 
                'start_time', 'end_time', 'location_name', 'location_address', 
                'google_maps_link', 'contact_person_name', 'contact_person_phone', 
                'volunteers_needed', 'min_volunteers', 'max_volunteers', 'registration_deadline'
            ];

            const updateData = {};
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = req.body[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
            }

            const updatedEvent = await AdminEventModel.updateEvent(id, updateData, adminId);
            
            return res.status(200).json({
                success: true,
                message: 'Event updated successfully.',
                data: updatedEvent
            });
        } catch (error) {
            if (error.message === "EVENT_NOT_FOUND") return res.status(404).json({ success: false, message: "Event not found." });
            if (error.message === "INVALID_EVENT_STATUS") return res.status(400).json({ success: false, message: "Cannot edit completed, cancelled, or archived events." });
            
            console.error('[Update Event Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to update event.' });
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
     * Safely soft-delete an event from the active roster
     */
    deleteSystemEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            const deletedEvent = await AdminEventModel.deleteEvent(id, adminId);
            
            if (!deletedEvent) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Event not found or already deleted.' 
                });
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Event successfully removed from active system.',
                data: deletedEvent
            });
        } catch (error) {
            console.error('[Event Deletion Failure]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Backend failure during deletion sequence.' 
            });
        }
    },

    /**
     * Generate Dynamic QR Token
     */
    generateDynamicQRToken: async (req, res) => {
        try {
            const { eventId } = req.params;
            const { type = "checkin" } = req.query;
            const adminId = req.user.userId;
            if (!["checkin", "checkout"].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid QR type."
                });
            }
            const qr =
                await AdminEventModel.generateQRCode(
                    eventId,
                    adminId,
                    type
                );
            return res.status(200).json({
                success: true,
                data: qr
            });
        } catch (error) {
            console.error("[Generate QR Error]", error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Manual Attendance Override
     */
    manualAttendanceUpdate: async (req, res) => {
        try {
            const { id: eventId } = req.params;
            const adminId = req.user.userId;
            const { volunteer_id, status, check_in_time, check_out_time, hours_logged, admin_remarks } = req.body;

            if (!volunteer_id) {
                return res.status(400).json({ success: false, message: 'volunteer_id is required.' });
            }

            const updatePayload = {
                status: status || null,
                check_in_time: check_in_time || null,
                check_out_time: check_out_time || null,
                hours_logged: hours_logged !== undefined ? hours_logged : null,
                admin_remarks: admin_remarks || null
            };

            const updatedRecord = await AdminEventModel.updateManualAttendance(eventId, volunteer_id, updatePayload, adminId);

            return res.status(200).json({
                success: true,
                message: 'Attendance record updated successfully.',
                data: updatedRecord
            });
        } catch (error) {
            if (error.message === "ATTENDANCE_RECORD_NOT_FOUND") {
                return res.status(404).json({ success: false, message: "No attendance record found for this volunteer at this event." });
            }
            console.error('[Manual Attendance Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to update attendance record.' });
        }
    },

    /**
     * List all structural events matching query parameters
     */
    listAllAdminEvents: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit, 10) || 50;
            const offset = parseInt(req.query.offset, 10) || 0;

            const filters = {
                search: req.query.search || null,
                location: req.query.location || null,
                category: req.query.category || null,
                status: req.query.status || null,
                sortBy: req.query.sortBy || 'created',
                sortOrder: req.query.sortOrder || 'DESC',
                limit,
                offset
            };

            const { data, totalCount } = await AdminEventModel.getAllEvents(filters);
            
            return res.status(200).json({ 
                success: true, 
                pagination: {
                    totalRecords: totalCount,
                    pageSize: limit,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(totalCount / limit)
                },
                data 
            });
        } catch (error) {
            console.error('[Event Engine List Query Error]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Structural processing failure during listing retrieval.' 
            });
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
                return res.status(404).json({ 
                    success: false, 
                    message: 'The requested system entity does not exist or has been soft-deleted.' 
                });
            }

            return res.status(200).json({ 
                success: true, 
                data: eventDetails 
            });
        } catch (error) {
            console.error('[Details Modal Retrieval Crash]:', error);
            
            // Checking for invalid UUID syntax errors from PostgreSQL
            if (error.code === '22P02') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid event ID format provided.' 
                });
            }

            return res.status(500).json({ 
                success: false, 
                message: 'Unified data structural collapse during retrieval operation.' 
            });
        }
    },
           
    



  

};

module.exports = AdminEventController;