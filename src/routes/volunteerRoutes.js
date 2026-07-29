const express = require('express');
const router = express.Router();

// Import Controllers
const volunteerController = require('../controllers/volunteerController');           // Handles Profile & Dashboard
const volunteerEventController = require('../controllers/volunteerEventController'); // Handles Events & Registration

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

module.exports = router;