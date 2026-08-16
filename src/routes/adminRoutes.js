const express = require('express');
const router = express.Router();

// Import both Controllers
const adminController = require('../controllers/adminController'); 
const AdminEventController = require('../controllers/adminEventController');
const AdminTaskController = require('../controllers/adminTaskController');

// Import Auth Middleware
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// ============================================================================
// GLOBAL ROUTER MIDDLEWARE
// Force secure credential evaluation across all operational administration routes
// ============================================================================
router.use(verifyToken);
router.use(isAdmin);


// ============================================================================
// EVENT MANAGEMENT (Core CRUD)
// ============================================================================

/**
 * @route   POST /api/admin/events
 * @desc    Inject a new structured data layout into event tracking subsystems
 * @swagger
 * /api/admin/events:
 *   post:
 *     summary: Create a new system event
 *     description: Creates an event in 'draft' status with strict validation rules.
 *     tags: [Admin Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - event_date
 *               - start_time
 *               - end_time
 *               - location_name
 *               - location_address
 *               - volunteers_needed
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               event_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               location_name:
 *                 type: string
 *               location_address:
 *                 type: string
 *               volunteers_needed:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error or missing fields
 *       401:
 *         description: Unauthorized
 */
router.post('/events', AdminEventController.createNewSystemEvent);

/**
 * @route   POST /api/admin/events/:id/publish
 * @desc    Update status of draft event to publish
 * @swagger
 * /api/admin/events/{id}/publish:
 *   post:
 *     summary: Publish a draft event
 *     description: Transitions a draft event to published status so volunteers can view and register.
 *     tags: [Admin Events]
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
 *         description: Event published successfully
 *       404:
 *         description: Event not found
 *       400:
 *         description: Invalid status transition
 */
router.post('/events/:id/publish', AdminEventController.publishSystemEvent);

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update specific details of a Draft or Published event
 * @swagger
 * /api/admin/events/{id}:
 *   put:
 *     summary: Update event details
 *     description: Modifies attributes of an existing draft or published event.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             description:
 *               type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Invalid status or missing data
 *       404:
 *         description: Event not found
 */
router.put('/events/:id', AdminEventController.updateSystemEvent);

/**
 * @route   POST /api/admin/events/:id/complete
 * @desc    Mark a published event as completed
 * @swagger
 * /api/admin/events/{id}/complete:
 *   post:
 *     summary: Complete an event
 *     description: Marks a published event as completed after its end time and flags unregistered volunteers as absent.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event completed successfully
 *       400:
 *         description: Event not finished yet or invalid status
 *       404:
 *         description: Event not found
 */
router.post('/events/:id/complete', AdminEventController.completeSystemEvent);

/**
 * @route   POST /api/admin/events/:id/cancel
 * @desc    Cancel a draft or published event
 * @swagger
 * /api/admin/events/{id}/cancel:
 *   post:
 *     summary: Cancel an event
 *     description: Cancels a draft or published event and updates volunteer attendance to withdrawn.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event cancelled successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Event not found
 */
router.post('/events/:id/cancel', AdminEventController.cancelSystemEvent);

/**
 * @route   POST /api/admin/events/:id/archive
 * @desc    Archive a completed or cancelled event
 * @swagger
 * /api/admin/events/{id}/archive:
 *   post:
 *     summary: Archive an event
 *     description: Archives a completed or cancelled event.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event archived successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Event not found
 */
router.post('/events/:id/archive', AdminEventController.archiveSystemEvent);

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Soft-delete an event, removing it from active queries and logging the action
 * @swagger
 * /api/admin/events/{id}:
 *   delete:
 *     summary: Soft-delete an event
 *     description: Flags an event as deleted and withdraws active volunteers.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event successfully removed
 *       404:
 *         description: Event not found
 */
router.delete('/events/:id', AdminEventController.deleteSystemEvent);

/**
 * @route   GET /api/admin/events/:eventId/qr-token
 * @desc    Generates a short-lived token for dynamic QR rendering on screen
 * @swagger
 * /api/admin/events/{eventId}/qr-token:
 *   get:
 *     summary: Generate dynamic QR token
 *     description: Generates a short-lived JWT for check-in or check-out scanning.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [checkin, checkout]
 *           default: checkin
 *     responses:
 *       200:
 *         description: QR token generated successfully
 *       400:
 *         description: Invalid time window or status
 */
router.get('/events/:eventId/qr-token', AdminEventController.generateDynamicQRToken);

/**
 * @route   PUT /api/admin/events/:id/attendance
 * @desc    Manually override a volunteer's attendance record (status, hours, remarks)
 * @swagger
 * /api/admin/events/{id}/attendance:
 *   put:
 *     summary: Manual attendance override
 *     description: Allows admins to manually modify attendance statuses, override hours, or add remarks.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - volunteer_id
 *             properties:
 *               volunteer_id:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [registered, present, absent, withdrawn]
 *               hours_logged:
 *                 type: number
 *               admin_remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance updated successfully
 *       404:
 *         description: Attendance record not found
 */
router.put('/events/:id/attendance', AdminEventController.manualAttendanceUpdate);

/**
 * @route   GET /api/admin/events
 * @desc    Query system event registers using filtering matrices and pagination
 * @swagger
 * /api/admin/events:
 *   get:
 *     summary: List all admin events
 *     description: Retrieves a filtered, sorted, and paginated list of all events.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
router.get('/events', AdminEventController.listAllAdminEvents);

/**
 * @route   GET /api/admin/events/:id
 * @desc    Pull exhaustive transactional histories and volunteer datasets for single entities
 * @swagger
 * /api/admin/events/{id}:
 *   get:
 *     summary: Get single event detailed summary
 *     description: Pulls comprehensive event data including full roster and timeline audit logs.
 *     tags: [Admin Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *       404:
 *         description: Event not found
 */
router.get('/events/:id', AdminEventController.getEventDetailSummary);


// ============================================================================
// VOLUNTEER MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/volunteers
 * @desc    View all registered volunteers
 * @swagger
 * /api/admin/volunteers:
 *   get:
 *     summary: List all registered volunteers
 *     description: Retrieves a paginated list of all volunteers with search and filtering capabilities.
 *     tags: [Admin Volunteers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Volunteers retrieved successfully
 */
router.get('/volunteers', adminController.getAllVolunteers);

/**
 * @route   GET /api/admin/volunteers/:userId
 * @desc    View a single volunteer's full profile
 * @swagger
 * /api/admin/volunteers/{userId}:
 *   get:
 *     summary: Get single volunteer profile & history
 *     description: Retrieves a specific volunteer's full biographical information and past event attendance history.
 *     tags: [Admin Volunteers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Volunteer profile retrieved successfully
 *       404:
 *         description: Volunteer not found
 */
router.get('/volunteers/:userId', adminController.getVolunteerProfile);

/**
 * @route   DELETE /api/admin/volunteers/:id
 * @desc    Soft-delete/Ban a volunteer account and withdraw them from future events
 * @swagger
 * /api/admin/volunteers/{id}:
 *   delete:
 *     summary: Deactivate a volunteer account
 *     description: Soft-deletes a volunteer account and automatically withdraws them from future commitments.
 *     tags: [Admin Volunteers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Volunteer successfully deactivated
 *       404:
 *         description: Volunteer not found
 */
router.delete('/volunteers/:id', adminController.deactivateVolunteerAccount);

/**
 * @route   GET /api/admin/dashboard-stats
 * @desc    Fetch comprehensive summary cards, leaderboards, and timelines for the Admin Dashboard
 * @swagger
 * /api/admin/dashboard-stats:
 *   get:
 *     summary: Get admin dashboard data matrix
 *     description: Retrieves high-level global metrics, top volunteer leaderboards, upcoming events, and system timelines.
 *     tags: [Admin Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 */
router.get('/dashboard-stats', adminController.getAdminDashboardStats);


// ============================================================================
// TASK MANAGEMENT (Core CRUD)
// ============================================================================

/**
 * @route   POST /api/admin/tasks
 * @desc    Create a new task assigned to a volunteer
 * @swagger
 * /api/admin/tasks:
 *   post:
 *     summary: Create task
 *     tags: [Admin Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, assigned_to]
 *             properties:
 *               event_id: { type: string, format: uuid }
 *               assigned_to: { type: string, format: uuid }
 *               title: { type: string }
 *               description: { type: string }
 *               deadline: { type: string, format: date-time }
 *               is_public: { type: boolean, default: true }
 */
router.post('/tasks', AdminTaskController.createNewTask);

/**
 * @route   GET /api/admin/tasks
 * @desc    Get all tasks with filtering
 * @swagger
 * /api/admin/tasks:
 *   get:
 *     summary: List tasks
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: query
 *         name: event_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: assigned_to
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 */
router.get('/tasks', AdminTaskController.listTasks);

/**
 * @route   GET /api/admin/tasks/:id
 * @desc    Get task details and timeline
 */
router.get('/tasks/:id', AdminTaskController.getTaskDetails);

/**
 * @route   PUT /api/admin/tasks/:id
 * @desc    Edit task details
 */
router.put('/tasks/:id', AdminTaskController.updateTaskDetails);

/**
 * @route   PATCH /api/admin/tasks/:id/status
 * @desc    Verify or change status (Complete, Cancel, etc.)
 */
router.patch('/tasks/:id/status', AdminTaskController.changeTaskStatus);

/**
 * @route   DELETE /api/admin/tasks/:id
 * @desc    Soft-delete a task
 */
router.delete('/tasks/:id', AdminTaskController.deleteTask);

module.exports = router;