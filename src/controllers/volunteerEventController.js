const jwt = require('jsonwebtoken');
const db = require('../config/db');
const VolunteerEventModel = require('../models/volunteerEventModel');

const VolunteerEventController = {
    getEvents: async (req, res) => {
        try {
            const userId = req.user.userId; // Extracted from JWT middleware
            const events = await VolunteerEventModel.getAvailableEvents(userId);
            return res.status(200).json({ success: true, data: events });
        } catch (error) {
            console.error('[Volunteer Fetch Events Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
        }
    },

    register: async (req, res) => {
        try {
            const { id: eventId } = req.params;
            const userId = req.user.userId;

            const result = await VolunteerEventModel.registerForEvent(eventId, userId);
            const message = result.status === 'waitlisted' 
                ? 'Event is full. You have been added to the waitlist.' 
                : 'Successfully registered for the event!';

            return res.status(200).json({ success: true, message, data: result.attendance });
        } catch (error) {
            console.error('[Volunteer Registration Error]:', error);
            // Pass clean error messages to the frontend
            return res.status(400).json({ success: false, message: error.message || 'Registration failed.' });
        }
    },

    withdraw: async (req, res) => {
        try {
            const { id: eventId } = req.params;
            const userId = req.user.userId;

            const withdrawn = await VolunteerEventModel.withdrawFromEvent(eventId, userId);
            
            if (!withdrawn) {
                return res.status(404).json({ success: false, message: 'Active registration not found.' });
            }

            return res.status(200).json({ success: true, message: 'Successfully withdrawn from event.' });
        } catch (error) {
            console.error('[Volunteer Withdrawal Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to process withdrawal.' });
        }
    },

    getAllEventsList: async (req, res) => {
        try {
            const userId = req.user.userId;

            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            const events = await VolunteerEventModel.getAllEventsHistory(userId, limit, offset);
            return res.status(200).json({ success: true, count: events.length, data: events });
        } catch (error) {
            console.error('[Volunteer Fetch All Events Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve event history.' });
        }
    },

    /**
     * Processes a QR code scan from a volunteer
     * Route: POST /api/volunteer/events/check-in
     */
    processQRCheckIn: async (req, res) => {
        try {
            const userId = req.user.userId;
            const qrToken = req.body.token || req.body.qrToken;

            if (!qrToken) {
                return res.status(400).json({ success: false, message: 'Check-in QR token is missing.' });
            }

            // 1. Verify the Token (This automatically throws an error if expired)
            let decoded;
            try {
                decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
            } catch (err) {
                const message = err.name === 'TokenExpiredError'
                    ? 'QR code expired. Please point your camera at the new code on the screen.'
                    : 'Invalid or unrecognized QR code.';
                
                return res.status(401).json({ success: false, message });
            }

            const { eventId } = decoded;
            if (!eventId) {
                return res.status(400).json({ success: false, message: 'Malformed QR token data.' });
            }

            // 2. Check current registration status
            const statusCheck = await db.query(
                `SELECT status FROM attendance WHERE event_id = $1 AND volunteer_id = $2`,
                [eventId, userId]
            );

            if (statusCheck.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'You are not registered for this event.' });
            }

            const currentStatus = statusCheck.rows[0].status;

            if (currentStatus === 'present') {
                return res.status(200).json({ success: true, message: 'You are already checked in!' });
            }

            if (currentStatus !== 'registered') {
                return res.status(403).json({ success: false, message: `Cannot check in. Current status: ${currentStatus}` });
            }

            // 3. Perform the Check-in
            await db.query(
                `UPDATE attendance 
                 SET status = 'present', check_in_time = NOW(), updated_at = NOW() 
                 WHERE event_id = $1 AND volunteer_id = $2`,
                [eventId, userId]
            );

            return res.status(200).json({ 
                success: true, 
                message: 'Check-in successful! Welcome to the event.' 
            });

        } catch (error) {
            console.error('[Volunteer QR Check-in Error]:', error);
            return res.status(500).json({ success: false, message: 'Check-in failed due to server error.' });
        }
    }
};

module.exports = VolunteerEventController;