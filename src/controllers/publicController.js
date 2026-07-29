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
                    success: true,
                    message: 'No upcoming events scheduled right now.', 
                    data: null 
                });
            }

            // --- Registration Status Engine ---
            let regStatus = "Closed";
            
            if (event.registration_open) {
                // 1. Check Capacity
                if (event.max_volunteers && event.current_registered >= event.max_volunteers) {
                    regStatus = "Full";
                } 
                // 2. Check Deadline
                else if (event.registration_deadline) {
                    const now = new Date();
                    const deadline = new Date(event.registration_deadline);
                    
                    if (now > deadline) {
                        regStatus = "Closed";
                    } else {
                        const diffMs = deadline - now;
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                        
                        if (diffDays > 1) {
                            regStatus = `Closes in ${diffDays} days`;
                        } else if (diffDays === 1) {
                            regStatus = `Closes tomorrow`;
                        } else if (diffHours > 0) {
                            regStatus = `Closes in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                        } else {
                            regStatus = "Closes soon";
                        }
                    }
                } 
                // 3. Open with no deadline specified
                else {
                    regStatus = "Open";
                }
            }

            // Attach the computed display properties to the response payload
            event.registration_status_message = regStatus;
            event.is_full = regStatus === "Full";

            return res.status(200).json({ 
                success: true,
                data: event 
            });

        } catch (error) {
            console.error('[Public Event Retrieval Error]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve the latest event.' 
            });
        }
    },

    /**
     * Handler to list all published upcoming events for the listing page
     */
    getAllPublicEvents: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit, 10) || 10;
            const offset = parseInt(req.query.offset, 10) || 0;

            const { data, totalCount } = await PublicModel.getAllUpcomingEvents(limit, offset);

            // --- Registration Status Engine ---
            const now = new Date();

            const formattedEvents = data.map(event => {
                let regStatus = "Closed";
                
                if (event.registration_open) {
                    if (event.max_volunteers && event.current_registered >= event.max_volunteers) {
                        regStatus = "Full";
                    } 
                    else if (event.registration_deadline) {
                        const deadline = new Date(event.registration_deadline);
                        
                        if (now > deadline) {
                            regStatus = "Closed";
                        } else {
                            const diffMs = deadline - now;
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                            
                            if (diffDays > 1) {
                                regStatus = `Closes in ${diffDays} days`;
                            } else if (diffDays === 1) {
                                regStatus = `Closes tomorrow`;
                            } else if (diffHours > 0) {
                                regStatus = `Closes in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                            } else {
                                regStatus = "Closes soon";
                            }
                        }
                    } 
                    else {
                        regStatus = "Open";
                    }
                }

                return {
                    ...event,
                    registration_status_message: regStatus,
                    is_full: regStatus === "Full"
                };
            });

            return res.status(200).json({ 
                success: true,
                pagination: {
                    totalRecords: totalCount,
                    pageSize: limit,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(totalCount / limit)
                },
                data: formattedEvents 
            });

        } catch (error) {
            console.error('[Public Events List Error]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve public events list.' 
            });
        }
    },

    /**
     * Handler to get the data of a specific event
     */
    getPublicEventById: async (req, res) => {
        try {
            const event = await PublicModel.getPublicEventDetails(req.params.id);
            
            if (!event) {
                return res.status(404).json({ success: false, message: 'Event not found or unavailable.' });
            }

            // --- Registration Status Engine ---
            let regStatus = "Closed";
            if (event.registration_open) {
                if (event.max_volunteers && event.current_registered >= event.max_volunteers) {
                    regStatus = "Full";
                } else if (event.registration_deadline) {
                    const now = new Date();
                    const deadline = new Date(event.registration_deadline);
                    regStatus = now > deadline ? "Closed" : "Open"; // Simplified logic for detail view, or reuse the detailed string logic
                } else {
                    regStatus = "Open";
                }
            }
            
            event.registration_status_message = regStatus;
            event.is_full = regStatus === "Full";

            return res.status(200).json({ success: true, data: event });
        } catch (error) {
            if (error.code === '22P02') {
                return res.status(400).json({ success: false, message: 'Invalid event ID.' });
            }
            return res.status(500).json({ success: false, message: 'Server error retrieving event details.' });
        }
    }
};

module.exports = publicController;