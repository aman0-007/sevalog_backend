const express = require('express');
const router = express.Router();

// Import Controllers
const volunteerController = require('../controllers/volunteerController');           // Handles Profile & Dashboard
const volunteerEventController = require('../controllers/volunteerEventController'); // Handles Events & Registration
const volunteerTaskController = require('../controllers/volunteerTaskController');

// Import Middleware
const { verifyToken, isVolunteer } = require('../middlewares/authMiddleware');

// ==========================================
// GLOBAL ROUTE PROTECTION
// ==========================================
// Automatically applies to ALL routes below this line
router.use(verifyToken);
router.use(isVolunteer); 

// ==========================================
// PROFILE & DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/volunteer/profile
 * @desc    Get the logged-in volunteer's profile data
 * @swagger
 * /api/volunteer/profile:
 *   get:
 *     summary: Get volunteer profile
 *     description: Retrieves the personal and biographical profile data of the currently logged-in volunteer.
 *     tags: [Volunteer Profile]
 *     responses:
 *       200:
 *         description: Profile data retrieved successfully
 *       404:
 *         description: Profile not found
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', volunteerController.getMyProfile);

/**
 * @route   PUT /api/volunteer/profile
 * @desc    Update volunteer bio and profile fields
 * @swagger
 * /api/volunteer/profile:
 *   put:
 *     summary: Update volunteer profile
 *     description: Updates biographical fields, skills, contact data, or profession/college for the logged-in volunteer.
 *     tags: [Volunteer Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               collegeName:
 *                 type: string
 *               profession:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error (e.g., missing college/profession)
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', volunteerController.updateMyProfile);

/**
 * @route   GET /api/volunteer/dashboard
 * @desc    Get dashboard metrics (total hours, completed activities)
 * @swagger
 * /api/volunteer/dashboard:
 *   get:
 *     summary: Get volunteer dashboard metrics
 *     description: Retrieves impact stats, upcoming event commitments, and recent activity history.
 *     tags: [Volunteer Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', volunteerController.getMyDashboard);

/**
 * @route   GET /api/volunteer/feed
 * @desc    Get the latest community activity timeline
 * @swagger
 * /api/volunteer/feed:
 *   get:
 *     summary: Get community feed
 *     description: Retrieves the latest activities across the NGO (event completions, badge earnings).
 *     tags: [Volunteer Dashboard]
 *     responses:
 *       200:
 *         description: Feed retrieved successfully
 */
router.get('/feed', volunteerController.getCommunityFeed);

/**
 * @route   GET /api/volunteer/leaderboard
 * @desc    Get the top volunteers ranked by verified hours
 * @swagger
 * /api/volunteer/leaderboard:
 *   get:
 *     summary: Get community leaderboard
 *     description: Retrieves the top volunteers ranked by their total logged hours. Can be filtered globally, by city, or by college.
 *     tags: [Volunteer Dashboard]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [global, city, college]
 *           default: global
 *         description: The grouping filter for the leaderboard
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of volunteers to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       400:
 *         description: Invalid filter type provided
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/leaderboard', volunteerController.getLeaderboard);

// ==========================================
// VOLUNTEER CERTIFICATE ROUTES
// ==========================================

/**
 * @route   GET /api/volunteer/certificates
 * @desc    Get a list of all verifiable certificates earned by the volunteer
 * @swagger
 * /api/volunteer/certificates:
 *   get:
 *     summary: List earned certificates
 *     description: Retrieves all verifiable certificates automatically generated for this volunteer upon event completion.
 *     tags: [Volunteer Certificates]
 *     responses:
 *       200:
 *         description: Certificates retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/certificates', volunteerController.listMyCertificates);

/**
 * @route   GET /api/volunteer/certificates/:id/download
 * @desc    Get the exact JSON data needed to draw the certificate on the frontend
 * @swagger
 * /api/volunteer/certificates/{id}/download:
 *   get:
 *     summary: Download certificate data
 *     description: Fetches the exact JSON properties (name, event, hours, date) needed to render the certificate on the frontend HTML5 canvas.
 *     tags: [Volunteer Certificates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Certificate UUID
 *     responses:
 *       200:
 *         description: Certificate data retrieved successfully
 *       404:
 *         description: Certificate not found or access denied
 *       401:
 *         description: Unauthorized
 */
router.get('/certificates/:id/download', volunteerController.downloadCertificateData);


/**
 * @route   GET /api/volunteer/events
 * @desc    Get all public, upcoming/ongoing events along with user's specific registration status
 * @swagger
 * /api/volunteer/events:
 *   get:
 *     summary: Browse available events for volunteers
 *     description: Fetches published upcoming events along with the volunteer's personal registration status for each.
 *     tags: [Volunteer Events]
 *     responses:
 *       200:
 *         description: List of events retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/events', volunteerEventController.getEvents);

/**
 * @route   POST /api/volunteer/events/:id/register
 * @desc    Register for an event (handles capacity and waitlisting)
 * @swagger
 * /api/volunteer/events/{id}/register:
 *   post:
 *     summary: Register for an event
 *     description: Enrolls the logged-in volunteer into a specific published event, checking limits and deadlines.
 *     tags: [Volunteer Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event UUID
 *     responses:
 *       200:
 *         description: Successfully registered
 *       400:
 *         description: Event full, deadline passed, or already registered
 *       401:
 *         description: Unauthorized
 */
router.post('/events/:id/register', volunteerEventController.register);

/**
 * @route   POST /api/volunteer/events/:id/withdraw
 * @desc    Cancel registration for an event
 * @swagger
 * /api/volunteer/events/{id}/withdraw:
 *   post:
 *     summary: Withdraw registration from an event
 *     description: Cancels the volunteer's registration for a specific event.
 *     tags: [Volunteer Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event UUID
 *     responses:
 *       200:
 *         description: Successfully withdrawn
 *       400:
 *         description: Not registered or event already passed
 *       401:
 *         description: Unauthorized
 */
router.post('/events/:id/withdraw', volunteerEventController.withdraw);

/**
 * @route   POST /api/volunteer/events/check-in
 * @desc    Processes a dynamic QR code scan from a volunteer to log attendance
 * @swagger
 * /api/volunteer/events/check-in:
 *   post:
 *     summary: Scan check-in QR code
 *     description: Verifies a short-lived dynamic QR token and marks the volunteer as present.
 *     tags: [Volunteer Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The JWT payload scanned from the admin's screen
 *     responses:
 *       200:
 *         description: Check-in successful
 *       400:
 *         description: Expired token or invalid QR payload
 *       401:
 *         description: Unauthorized
 */
router.post('/events/check-in', volunteerEventController.checkin);

/**
 * @route   POST /api/volunteer/events/checkout
 * @desc    Checkout from an event after attendance has been marked
 * @swagger
 * /api/volunteer/events/checkout:
 *   post:
 *     summary: Scan checkout QR code
 *     description: Verifies a checkout token and records check-out time, triggering automated hour tracking.
 *     tags: [Volunteer Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The checkout JWT token
 *     responses:
 *       200:
 *         description: Checkout completed successfully
 *       400:
 *         description: Invalid state or expired token
 *       401:
 *         description: Unauthorized
 */
router.post('/events/check-out', volunteerEventController.checkout);


// ==========================================
// VOLUNTEER TASK MANAGEMENT
// ==========================================

/**
 * @route   GET /api/volunteer/tasks
 * @desc    View assigned tasks and public tasks
 * @swagger
 * /api/volunteer/tasks:
 *   get:
 *     summary: Get tasks
 *     tags: [Volunteer Tasks]
 */
router.get('/tasks', volunteerTaskController.listTasks);

/**
 * @route   PATCH /api/volunteer/tasks/:id/progress
 * @desc    Update task status (in_progress, pending_verification) & add remarks
 * @swagger
 * /api/volunteer/tasks/{id}/progress:
 *   patch:
 *     summary: Update task progress
 *     tags: [Volunteer Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [in_progress, pending_verification] }
 *               volunteer_remarks: { type: string }
 */
router.patch('/tasks/:id/progress', volunteerTaskController.updateProgress);

module.exports = router;