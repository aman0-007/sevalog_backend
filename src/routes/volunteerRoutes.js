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
 */
router.get('/profile', volunteerController.getMyProfile);

/**
 * @route   PUT /api/volunteer/profile
 * @desc    Update volunteer bio and profile fields
 */
router.put('/profile', volunteerController.updateMyProfile);

/**
 * @route   GET /api/volunteer/dashboard
 * @desc    Get dashboard metrics (total hours, completed activities)
 */
router.get('/dashboard', volunteerController.getMyDashboard);


// ==========================================
// EVENT & REGISTRATION ROUTES
// ==========================================

/**
 * @route   GET /api/volunteer/events
 * @desc    Get all public, upcoming/ongoing events along with user's specific registration status
 */
router.get('/events', volunteerEventController.getEvents);

/**
 * @route   GET /api/volunteer/events/all
 * @desc    Get history of all events (past and future) with the user's specific status
 */
router.get('/events/all', volunteerEventController.getAllEventsList);

/**
 * @route   POST /api/volunteer/events/check-in
 * @desc    Processes a dynamic QR code scan from a volunteer to log attendance
 */
router.post('/events/check-in', volunteerEventController.processQRCheckIn);

/**
 * @route   POST /api/volunteer/events/:id/register
 * @desc    Register for an event (handles capacity and waitlisting)
 */
router.post('/events/:id/register', volunteerEventController.register);

/**
 * @route   POST /api/volunteer/events/:id/withdraw
 * @desc    Cancel registration for an event
 */
router.post('/events/:id/withdraw', volunteerEventController.withdraw);

module.exports = router;