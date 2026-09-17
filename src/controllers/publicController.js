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
    },

    /**
     * Public Impact & Organization Statistics
     * Returns unified metric counters across hours, volunteers, events, tasks,
     * certificates, badges, category impact, and volunteer rank distribution.
     */
    getPublicImpactStats: async (req, res) => {
        try {
            const stats = await PublicModel.getPublicImpactStats();
            
            const rawSummary = stats.summary || {};
            const eventHours = parseFloat(rawSummary.event_hours || 0);
            const taskHours = parseFloat(rawSummary.task_hours || 0);
            const totalHours = Math.round((eventHours + taskHours) * 100) / 100;
            const totalVolunteers = parseInt(rawSummary.total_volunteers || 0, 10);
            const activeVolunteers = parseInt(rawSummary.active_volunteers || 0, 10);
            const totalEventsCompleted = parseInt(rawSummary.total_events_completed || 0, 10);
            const totalEventsCreated = parseInt(rawSummary.total_events_created || 0, 10);
            const totalEventsActive = parseInt(rawSummary.total_events_active || 0, 10);
            const totalTasksCompleted = parseInt(rawSummary.total_tasks_completed || 0, 10);
            const totalTasksCreated = parseInt(rawSummary.total_tasks_created || 0, 10);
            const totalAttendancesMarked = parseInt(rawSummary.total_attendances_marked || 0, 10);
            const totalRegistrations = parseInt(rawSummary.total_registrations_received || 0, 10);
            const totalCertificates = parseInt(rawSummary.total_certificates_issued || 0, 10);
            const masterCertificates = parseInt(rawSummary.master_certificates_issued || 0, 10);
            const eventCertificates = parseInt(rawSummary.event_certificates_issued || 0, 10);
            const taskCertificates = parseInt(rawSummary.task_certificates_issued || 0, 10);
            const totalBadges = parseInt(rawSummary.total_badges_unlocked || 0, 10);

            // Calculate engagement rate
            const volunteerEngagementRate = totalVolunteers > 0
                ? Math.round((activeVolunteers / totalVolunteers) * 100)
                : 0;

            const formattedResponse = {
                success: true,
                message: "Public impact statistics retrieved successfully.",
                data: {
                    overview: {
                        total_seva_hours_logged: totalHours,
                        event_hours_logged: eventHours,
                        task_hours_logged: taskHours,
                        total_registered_volunteers: totalVolunteers,
                        active_volunteers_count: activeVolunteers,
                        volunteer_engagement_rate_percent: volunteerEngagementRate,
                        total_activities_completed: totalEventsCompleted + totalTasksCompleted,
                        total_certificates_issued: totalCertificates
                    },
                    events: {
                        total_events_conducted: totalEventsCompleted,
                        total_events_scheduled: totalEventsCreated,
                        active_published_events: totalEventsActive,
                        total_volunteer_attendances: totalAttendancesMarked,
                        total_event_registrations: totalRegistrations
                    },
                    tasks: {
                        total_tasks_completed: totalTasksCompleted,
                        total_tasks_assigned: totalTasksCreated,
                        task_completion_rate_percent: totalTasksCreated > 0 
                            ? Math.round((totalTasksCompleted / totalTasksCreated) * 100)
                            : 0
                    },
                    certificates_and_recognition: {
                        total_certificates_awarded: totalCertificates,
                        master_certificates_60hr_milestone: masterCertificates,
                        event_certificates: eventCertificates,
                        task_certificates: taskCertificates,
                        total_badges_earned_by_volunteers: totalBadges
                    },
                    impact_by_category: stats.categories.map(c => ({
                        category: c.category,
                        events_count: parseInt(c.events_count || 0, 10),
                        hours_logged: Math.round(parseFloat(c.hours_logged || 0) * 100) / 100,
                        volunteer_participations: parseInt(c.volunteer_participations || 0, 10)
                    })),
                    volunteer_rank_distribution: stats.rankDistribution.map(r => ({
                        rank_name: r.rank_name,
                        min_hours: parseFloat(r.min_hours),
                        color_hex: r.color_hex,
                        icon_name: r.icon_name,
                        volunteer_count: parseInt(r.volunteer_count || 0, 10)
                    }))
                }
            };

            return res.status(200).json(formattedResponse);
        } catch (error) {
            console.error('[Public Impact Stats Error]:', error);
            return res.status(500).json({
                success: false,
                message: "Failed to load public impact statistics."
            });
        }
    }
};

module.exports = publicController;