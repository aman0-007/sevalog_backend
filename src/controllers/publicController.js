const PublicModel = require('../models/publicModel');

const publicController = {
    /**
     * Handler to send the latest upcoming event to the public homepage
     */
    getLatestUpcomingEvent: async (req, res, next) => {
        try {
            const event = await PublicModel.getLatestEvent();
            
            if (!event) {
                return res.status(200).json({ 
                    message: 'No upcoming events scheduled right now.', 
                    data: null 
                });
            }

            res.status(200).json({ data: event });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = publicController;