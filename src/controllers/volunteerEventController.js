const jwt = require('jsonwebtoken');
const db = require('../config/db');
const VolunteerEventModel = require('../models/volunteerEventModel');

const VolunteerEventController = {
    getEvents: async (req, res) => {
        try {
            const userId = req.user.userId; // Extracted from JWT middleware
            const events = await VolunteerEventModel.getEvents(userId);
            return res.status(200).json({ 
                success: true, 
                count:events.length,
                data: events 
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Failed to fetch events.' });
        }
    },

    register: async (req, res) => {
        try {
            const { id: eventId } = req.params;
            const userId = req.user.userId;

            const result = await VolunteerEventModel.registerForEvent(eventId, userId);

            return res.status(200).json({ success: true, message:"Successfully registered for the event.", data: result.attendance });
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

            await VolunteerEventModel.withdrawFromEvent(eventId, userId);

            return res.status(200).json({ success: true, message: 'Successfully withdrawn from event.' });
        } catch (error) {
            console.error('[Volunteer Withdrawal Error]:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    checkin: async (req, res) => {
        try {
            const userId = req.user.userId;
            const qrToken = req.body.token || req.body.qrToken;

            if (!qrToken) {
                return res.status(400).json({ success: false, message: 'QR token is required.' });
            }

            let decoded;
            try {
                decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ 
                    success: false, 
                    message: err.name === 'TokenExpiredError' ? 'QR code has expired.' : 'Invalid QR code.'
                });
            }

            // SECURITY FIX: Ensure this is actually a check-in QR code
            if (!decoded.eventId || decoded.action !== 'checkin') {
                return res.status(400).json({ success: false, message: "Invalid QR code type for check-in." });
            }

            const result = await VolunteerEventModel.checkInVolunteer(decoded.eventId, userId);

            return res.status(200).json({ 
                success: true, 
                message: 'Check-in successful.',
                data: result 
            });

        } catch (error) {
            console.error('[QR Check-in Error]:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    },

    checkout: async (req, res) => {
        try {
            const userId = req.user.userId;
            const qrToken = req.body.token || req.body.qrToken;

            if (!qrToken) {
                return res.status(400).json({ success: false, message: "Checkout QR token is missing." });
            }

            let decoded;
            try {
                decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({
                    success: false,
                    message: err.name === "TokenExpiredError" ? "QR code has expired." : "Invalid QR code."
                });
            }

            // SECURITY FIX: Ensure this is actually a checkout QR code
            if (!decoded.eventId || decoded.action !== 'checkout') {
                return res.status(400).json({ success: false, message: "Invalid QR code type for checkout." });
            }

            const attendance = await VolunteerEventModel.checkOutVolunteer(decoded.eventId, userId);
            
            return res.status(200).json({
                success: true,
                message: "Checkout completed successfully.",
                data: attendance
            });
        } catch (error) {
            console.error("[Volunteer Checkout Error]:", error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

};

module.exports = VolunteerEventController;