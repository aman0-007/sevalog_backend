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
                if (event.max_volunteers && event.current_registered >= event.max_volunteers) {
                    regStatus = "Full";
                } 
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
                else {
                    regStatus = "Open";
                }
            }

            event.registration_status_message = regStatus;
            event.is_full = regStatus === "Full";

            return res.status(200).json({ success: true, data: event });
        } catch (error) {
            console.error('[Public Event Retrieval Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve the latest event.' });
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

            const now = new Date();
            const formattedEvents = data.map(event => {
                let regStatus = "Closed";
                
                if (event.registration_open) {
                    if (event.max_volunteers && event.current_registered >= event.max_volunteers) {
                        regStatus = "Full";
                    } else if (event.registration_deadline) {
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
                    } else {
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
            return res.status(500).json({ success: false, message: 'Failed to retrieve public events list.' });
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

            let regStatus = "Closed";
            if (event.registration_open) {
                if (event.max_volunteers && event.current_registered >= event.max_volunteers) {
                    regStatus = "Full";
                } else if (event.registration_deadline) {
                    const now = new Date();
                    const deadline = new Date(event.registration_deadline);
                    regStatus = now > deadline ? "Closed" : "Open";
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
    },

    /**
     * NEW: Publicly verify a certificate UUID
     */
    verifyCertificate: async (req, res) => {
        try {
            const { id } = req.params;
            const cert = await PublicModel.verifyCertificate(id);
            
            if (!cert) {
                return res.status(404).json({ 
                    success: false, 
                    status: "Invalid", 
                    message: "This certificate ID does not exist in our system." 
                });
            }

            let activityName = cert.event_title;
            if (!activityName) {
                if (cert.type === 'master') {
                    activityName = "Overall Master Certificate";
                } else if (cert.type === 'task') {
                    activityName = "Task Contribution Certificate";
                } else {
                    activityName = "Community Seva Certificate";
                }
            }

            return res.status(200).json({
                success: true,
                status: "Valid",
                data: {
                    certificate_id: cert.certificate_id,
                    volunteer_name: `${cert.first_name} ${cert.last_name}`,
                    event: activityName,
                    certificate_type: cert.type,
                    hours: cert.hours_credited,
                    description: cert.description,
                    issued_at: cert.issued_at
                }
            });

        } catch (error) {
            if (error.code === '22P02') {
                return res.status(400).json({ success: false, status: "Invalid", message: "Invalid certificate format." });
            }
            console.error('[Public Verification Error]:', error);
            return res.status(500).json({ success: false, message: 'Server error during verification.' });
        }
    },

    /**
     * Download public certificate data (for rendering certificate badge/canvas/PDF)
     * GET /api/public/verify-certificate/:id/download
     */
    downloadPublicCertificate: async (req, res) => {
        try {
            const { id } = req.params;

            const cert = await PublicModel.verifyCertificate(id);

            if (!cert) {
                return res.status(404).json({
                    success: false,
                    status: "Invalid",
                    message: "Certificate not found or does not exist."
                });
            }

            let activityName = cert.event_title;
            if (!activityName) {
                if (cert.type === 'master') {
                    activityName = "Overall Master Certificate";
                } else if (cert.type === 'task') {
                    activityName = "Task Contribution Certificate";
                } else {
                    activityName = "Community Seva Certificate";
                }
            }

            return res.status(200).json({
                success: true,
                status: "Valid",
                data: {
                    certificate_id: cert.certificate_id,
                    type: cert.type,
                    hours_credited: cert.hours_credited,
                    issued_at: cert.issued_at,
                    description: cert.description,
                    event_title: activityName,
                    event_date: cert.event_date || null,
                    first_name: cert.first_name,
                    last_name: cert.last_name,
                    volunteer_name: `${cert.first_name} ${cert.last_name}`
                }
            });

        } catch (error) {
            if (error.code === '22P02') {
                return res.status(400).json({ success: false, status: "Invalid", message: "Invalid certificate format." });
            }
            console.error('[Public Certificate Download Error]:', error);
            return res.status(500).json({ success: false, message: 'Server error during certificate retrieval.' });
        }
    }
};

module.exports = publicController;