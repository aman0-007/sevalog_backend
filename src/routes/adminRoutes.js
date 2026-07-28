const express = require('express');
const router = express.Router();

// Import both Controllers
const adminController = require('../controllers/adminController'); 
const AdminEventController = require('../controllers/adminEventController');

// Import Auth Middleware
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// ============================================================================
// GLOBAL ROUTER MIDDLEWARE
// Force secure credential evaluation across all operational administration routes
// ============================================================================
router.use(verifyToken);
router.use(isAdmin);


// ============================================================================
// DASHBOARDS & METRICS (Static routes must go first)
// ============================================================================

/**
 * @route   GET /api/admin/events/metrics
 * @desc    Fetch operational analytics values from background structural caches
 */
router.get('/events/metrics', AdminEventController.getDashboardMetrics);

/**
 * @route   GET /api/admin/summary-stats
 * @desc    Fetch quick high-level summary cards for the Samithi stats page
 */
router.get('/summary-stats', adminController.getSamithiOverview);


// ============================================================================
// VOLUNTEER MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/volunteers
 * @desc    View all registered volunteers
 */
router.get('/volunteers', adminController.getAllVolunteers);

/**
 * @route   GET /api/admin/volunteers/:userId
 * @desc    View a single volunteer's full profile
 */
router.get('/volunteers/:userId', adminController.getVolunteerProfile);


// ============================================================================
// EVENT MANAGEMENT (Core CRUD)
// ============================================================================

/**
 * @route   POST /api/admin/events
 * @desc    Inject a new structured data layout into event tracking subsystems
 */
router.post('/events', AdminEventController.createNewSystemEvent);

/**
 * @route   POST /api/admin/events/:id/publish
 * @desc    Update status of draft event to publish
 */
router.post('/events/:id/publish', AdminEventController.publishSystemEvent);

/**
 * @route   POST /api/admin/events/:id/complete
 * @desc    Mark a published event as completed
 */
router.post('/events/:id/complete', AdminEventController.completeSystemEvent);

/**
 * @route   POST /api/admin/events/:id/cancel
 * @desc    Cancel a draft or published event
 */
router.post('/events/:id/cancel', AdminEventController.cancelSystemEvent);

/**
 * @route   POST /api/admin/events/:id/archive
 * @desc    Archive a completed or cancelled event
 */
router.post('/events/:id/archive', AdminEventController.archiveSystemEvent);

/**
 * @route   GET /api/admin/events/:eventId/qr-token
 * @desc    Generates a short-lived token for dynamic QR rendering on screen
 */
router.get('/events/:eventId/qr-token', AdminEventController.generateDynamicQRToken);

/**
 * @route   GET /api/admin/events/:eventId/checkout-qr
 * @desc    Generate dynamic Checkout QR token
 */
router.get("/events/:eventId/checkout-qr", AdminEventController.generateCheckoutQRToken);



//=========================================//
/**
 * @route   GET /api/admin/events
 * @desc    Query system event registers using filtering matrices
 */
router.get('/events', AdminEventController.listAllAdminEvents);




// ============================================================================
// EVENT OPERATIONS & ATTENDANCE (Sub-routes)
// ============================================================================


/**
 * @route   PUT /api/admin/events/attendance/:attendanceId
 * @desc    Alter participation states or commit post-activity metrics overrides
 */
router.put('/events/attendance/:attendanceId', AdminEventController.updateRosterParticipation);


/**
 * @route   GET /api/admin/events/:eventId/report
 * @desc    View specific applied volunteer rosters and logs for an event
 */
router.get('/events/:eventId/report', adminController.getEventReport);


// ============================================================================
// DYNAMIC EVENT ENTITIES (Must be at the absolute bottom of /events)
// ============================================================================

/**
 * @route   GET /api/admin/events/:id
 * @desc    Pull exhaustive transactional histories and volunteer datasets for single entities
 */
router.get('/events/:id', AdminEventController.getEventDetailSummary);

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Apply partial modifications to individual event data objects
 */
router.put('/events/:id', AdminEventController.modifySystemEvent);

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Soft-delete an event, removing it from active queries and logging the action
 */
router.delete('/events/:id', AdminEventController.deleteSystemEvent);

module.exports = router;