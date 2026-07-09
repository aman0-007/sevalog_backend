const VolunteerModel = require('../models/volunteerModel');

const volunteerController = {
    /**
     * Handler to update the volunteer profile fields
     */
    updateMyProfile: async (req, res, next) => {
        try {
            // NOTE: In a complete system, req.user.id comes safely from an Auth Middleware decoding a JWT token.
            // For now, we will expect the user_id to be sent or mocked.
            const userId = req.user.userId;

            if (!userId) {
                return res.status(400).json({ error: 'User ID authentication identifier is missing.' });
            }

            const updatedUser = await VolunteerModel.updateProfile(userId, req.body);
            
            if (!updatedUser) {
                return res.status(404).json({ error: 'Volunteer profile not found or unauthorized.' });
            }

            res.status(200).json({
                message: 'Profile updated successfully.',
                data: updatedUser
            });
        } catch (error) {
            next(error); // Pass internal database errors down to our global error middleware
        }
    },

    /**
     * Handler to get data for the volunteer home dashboard screen
     */
    getMyDashboard: async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'] || req.query.userId;

            if (!userId) {
                return res.status(400).json({ error: 'User ID authentication identifier is missing.' });
            }

            const stats = await VolunteerModel.getDashboardStats(userId);
            res.status(200).json({ data: stats });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Handler to fetch upcoming events
     */
    getEvents: async (req, res, next) => {
        try {
            const events = await VolunteerModel.getUpcomingEvents();
            res.status(200).json({ data: events });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Handler to submit an application for an event
     */
    applyToEvent: async (req, res, next) => {
        try {
            // We now get the user ID securely from the decoded JWT token!
            const userId = req.user.userId; 
            const { eventId } = req.body;

            if (!eventId) {
                return res.status(400).json({ error: 'Event ID is required.' });
            }

            const application = await VolunteerModel.applyForEvent(userId, eventId);
            
            res.status(201).json({
                message: 'Successfully applied for the event. Status is pending.',
                data: application
            });
        } catch (error) {
            // PostgreSQL throws error code 23505 if a unique constraint is violated (applying twice)
            if (error.code === '23505') {
                return res.status(409).json({ error: 'You have already applied for this event.' });
            }
            next(error); // Passes capacity trigger errors (from our database trigger) to the frontend
        }
    }
};

module.exports = volunteerController;