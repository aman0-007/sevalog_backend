const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

/**
 * @route   GET /api/public/latest-event
 * @desc    Public route to fetch the next upcoming event
 * @swagger
 * /api/public/latest-event:
 *   get:
 *     summary: Fetch the next upcoming event
 *     description: Retrieves the single most immediate upcoming or ongoing event that is published. Returns null if no upcoming events are scheduled.
 *     tags: [Public]
 *     security: [] 
 *     responses:
 *       200:
 *         description: Successfully retrieved the latest event (or null if none scheduled)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "No upcoming events scheduled right now."
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     event_id:
 *                       type: string
 *                       format: uuid
 *                       example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                     title:
 *                       type: string
 *                       example: "Weekend Beach Cleanup Drive"
 *                     description:
 *                       type: string
 *                       example: "Join us this Saturday for a community cleanup at Juhu Beach."
 *                     event_date:
 *                       type: string
 *                       format: date
 *                       example: "2026-10-15"
 *                     start_time:
 *                       type: string
 *                       example: "08:00:00"
 *                     end_time:
 *                       type: string
 *                       example: "12:00:00"
 *                     location_name:
 *                       type: string
 *                       example: "Juhu Beach Chowpatty"
 *                     location_address:
 *                       type: string
 *                       example: "Juhu Tara Rd, Juhu, Mumbai, Maharashtra 400049"
 *                     google_maps_link:
 *                       type: string
 *                       example: "https://maps.google.com/?q=19.0988,72.8267"
 *                     volunteers_needed:
 *                       type: integer
 *                       example: 50
 *                     max_volunteers:
 *                       type: integer
 *                       example: 75
 *                     registration_open:
 *                       type: boolean
 *                       example: true
 *                     registration_deadline:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-10-14T23:59:59.000Z"
 *                     current_registered:
 *                       type: integer
 *                       example: 32
 *                     time_phase:
 *                       type: string
 *                       enum: [upcoming, ongoing]
 *                       example: "upcoming"
 *                     registration_status_message:
 *                       type: string
 *                       example: "Closes in 3 days"
 *                     is_full:
 *                       type: boolean
 *                       example: false
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve the latest event."
 */
router.get('/latest-event', publicController.getLatestUpcomingEvent);

/**
 * @route   GET /api/public/events
 * @desc    Public route to fetch all upcoming events (paginated)
 * @swagger
 * /api/public/events:
 *   get:
 *     summary: Fetch all upcoming public events
 *     description: Retrieves a paginated list of all published upcoming and ongoing events.
 *     tags: [Public]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of events to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip
 *     responses:
 *       200:
 *         description: A paginated list of upcoming events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                       example: 24
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       event_id:
 *                         type: string
 *                         format: uuid
 *                         example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                       title:
 *                         type: string
 *                         example: "Weekend Beach Cleanup Drive"
 *                       category:
 *                         type: string
 *                         enum: ['Teaching & Mentorship', 'Tech & Development', 'Media & Photography', 'Content & Design', 'Wall Painting', 'Core & Planning', 'Other']
 *                         example: "Wall Painting"
 *                       event_date:
 *                         type: string
 *                         format: date
 *                         example: "2026-10-15"
 *                       start_time:
 *                         type: string
 *                         example: "08:00:00"
 *                       end_time:
 *                         type: string
 *                         example: "12:00:00"
 *                       location_name:
 *                         type: string
 *                         example: "Juhu Beach"
 *                       volunteers_needed:
 *                         type: integer
 *                         example: 50
 *                       max_volunteers:
 *                         type: integer
 *                         example: 75
 *                       registration_open:
 *                         type: boolean
 *                         example: true
 *                       registration_deadline:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-10-14T23:59:59.000Z"
 *                       current_registered:
 *                         type: integer
 *                         example: 18
 *                       time_phase:
 *                         type: string
 *                         enum: [upcoming, ongoing]
 *                         example: "upcoming"
 *                       registration_status_message:
 *                         type: string
 *                         example: "Open"
 *                       is_full:
 *                         type: boolean
 *                         example: false
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve public events list."
 */
router.get('/events', publicController.getAllPublicEvents);

/**
 * @route   GET /api/public/events/:id
 * @desc    Public route to view full details of a specific event
 * @swagger
 * /api/public/events/{id}:
 *   get:
 *     summary: Get full details of a specific event
 *     description: Retrieves complete details for a single published event based on its UUID.
 *     tags: [Public]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the event
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     event_id:
 *                       type: string
 *                       format: uuid
 *                       example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                     title:
 *                       type: string
 *                       example: "Weekend Beach Cleanup Drive"
 *                     description:
 *                       type: string
 *                       example: "Full details about equipment provided, parking instructions, and meeting locations."
 *                     category:
 *                       type: string
 *                       enum: ['Teaching & Mentorship', 'Tech & Development', 'Media & Photography', 'Content & Design', 'Wall Painting', 'Core & Planning', 'Other']
 *                       example: "Wall Painting"
 *                     event_date:
 *                       type: string
 *                       format: date
 *                       example: "2026-10-15"
 *                     start_time:
 *                       type: string
 *                       example: "08:00:00"
 *                     end_time:
 *                       type: string
 *                       example: "12:00:00"
 *                     location_name:
 *                       type: string
 *                       example: "Juhu Beach Chowpatty"
 *                     location_address:
 *                       type: string
 *                       example: "Juhu Tara Rd, Juhu, Mumbai, Maharashtra 400049"
 *                     google_maps_link:
 *                       type: string
 *                       example: "https://maps.google.com/?q=19.0988,72.8267"
 *                     contact_person_name:
 *                       type: string
 *                       example: "Aarav Mehta"
 *                     contact_person_phone:
 *                       type: string
 *                       example: "+919876543210"
 *                     volunteers_needed:
 *                       type: integer
 *                       example: 50
 *                     max_volunteers:
 *                       type: integer
 *                       example: 75
 *                     registration_open:
 *                       type: boolean
 *                       example: true
 *                     registration_deadline:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-10-14T23:59:59.000Z"
 *                     current_registered:
 *                       type: integer
 *                       example: 22
 *                     registration_status_message:
 *                       type: string
 *                       example: "Open"
 *                     is_full:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid event ID format (must be a valid UUID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid event ID."
 *       404:
 *         description: Event not found or unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Event not found or unavailable."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error retrieving event details."
 */
router.get('/events/:id', publicController.getPublicEventById);

/**
 * @route   GET /api/public/verify-certificate/:id
 * @desc    Publicly verify the authenticity of a volunteer certificate
 * @swagger
 * /api/public/verify-certificate/{id}:
 *   get:
 *     summary: Verify a certificate
 *     description: Open endpoint for third parties (schools, universities, employers, recruiters) to verify a certificate UUID without requiring authentication. Supports event, task, and 60-hour master certificates.
 *     tags: [Public]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique certificate UUID
 *         example: "c79fb4cf-9c60-4966-9b54-dcf03d47ad92"
 *     responses:
 *       200:
 *         description: Certificate is authentic and valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "Valid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     volunteer_name:
 *                       type: string
 *                       example: "Rahul Sharma"
 *                     event:
 *                       type: string
 *                       example: "Weekend Beach Cleanup Drive"
 *                     certificate_type:
 *                       type: string
 *                       enum: [event, master, task]
 *                       example: "event"
 *                     hours:
 *                       type: number
 *                       example: 4.5
 *                     issued_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-09-15T14:30:00.000Z"
 *       400:
 *         description: Invalid certificate UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: "Invalid"
 *                 message:
 *                   type: string
 *                   example: "Invalid certificate format."
 *       404:
 *         description: Certificate is invalid or not found in the system
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: "Invalid"
 *                 message:
 *                   type: string
 *                   example: "This certificate ID does not exist in our system."
 *       500:
 *         description: Server error during verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error during verification."
 */
router.get('/verify-certificate/:id', publicController.verifyCertificate);

/**
 * @route   GET /api/public/verify-certificate/:id/download
 * @desc    Public route to download certificate data for rendering certificate badge, canvas, or PDF
 * @swagger
 * /api/public/verify-certificate/{id}/download:
 *   get:
 *     summary: Download public certificate rendering data
 *     description: Unauthenticated endpoint for volunteers, recruiters, employers, and universities to fetch complete certificate data (volunteer name, event title, date, issued timestamp, accredited hours, and description) for rendering on HTML5 canvas or downloading as PDF.
 *     tags: [Public]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique certificate UUID
 *         example: "c79fb4cf-9c60-4966-9b54-dcf03d47ad92"
 *     responses:
 *       200:
 *         description: Certificate download data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: "Valid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     certificate_id:
 *                       type: string
 *                       format: uuid
 *                       example: "c79fb4cf-9c60-4966-9b54-dcf03d47ad92"
 *                     type:
 *                       type: string
 *                       enum: [event, master, task]
 *                       example: "event"
 *                     hours_credited:
 *                       type: number
 *                       example: 4.5
 *                     issued_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-09-15T14:30:00.000Z"
 *                     description:
 *                       type: string
 *                       example: "In recognition of dedicated service in Weekend Beach Cleanup Drive."
 *                     event_title:
 *                       type: string
 *                       example: "Weekend Beach Cleanup Drive"
 *                     event_date:
 *                       type: string
 *                       format: date
 *                       example: "2026-09-15"
 *                     first_name:
 *                       type: string
 *                       example: "Rahul"
 *                     last_name:
 *                       type: string
 *                       example: "Sharma"
 *                     volunteer_name:
 *                       type: string
 *                       example: "Rahul Sharma"
 *       400:
 *         description: Invalid certificate UUID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: "Invalid"
 *                 message:
 *                   type: string
 *                   example: "Invalid certificate format."
 *       404:
 *         description: Certificate not found or does not exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: "Invalid"
 *                 message:
 *                   type: string
 *                   example: "Certificate not found or does not exist."
 *       500:
 *         description: Server error during certificate retrieval
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error during certificate retrieval."
 */
router.get('/verify-certificate/:id/download', publicController.downloadPublicCertificate);

module.exports = router;