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
// ADMIN DASHBOARD
// ============================================================================

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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
 */
router.get('/dashboard-stats', adminController.getAdminDashboardStats);


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
 *                 enum: ['Teaching & Mentorship', 'Tech & Development', 'Media & Photography', 'Content & Design', 'Wall Painting', 'Core & Planning', 'Other']
 *                 default: 'Other'
 *               event_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *                 example: "09:00:00"
 *               end_time:
 *                 type: string
 *                 example: "13:00:00"
 *               location_name:
 *                 type: string
 *               location_address:
 *                 type: string
 *               volunteers_needed:
 *                 type: integer
 *               registration_deadline:
 *                 type: string
 *                 format: date-time
 *               meeting_point:
 *                 type: string
 *               contact_person_name:
 *                 type: string
 *               contact_person_phone:
 *                 type: string
 *               contact_person_email:
 *                 type: string
 *               perks:
 *                 type: array
 *                 items:
 *                   type: string
 *               instructions:
 *                 type: array
 *                 items:
 *                   type: string
 *               required_skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               is_recurring:
 *                 type: boolean
 *                 default: false
 *               is_certificate_eligible:
 *                 type: boolean
 *                 default: true
 *               min_hours_for_certificate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
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
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: ['Teaching & Mentorship', 'Tech & Development', 'Media & Photography', 'Content & Design', 'Wall Painting', 'Core & Planning', 'Other']
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
 *               registration_deadline:
 *                 type: string
 *                 format: date-time
 *               meeting_point:
 *                 type: string
 *               contact_person_name:
 *                 type: string
 *               contact_person_phone:
 *                 type: string
 *               contact_person_email:
 *                 type: string
 *               perks:
 *                 type: array
 *                 items:
 *                   type: string
 *               instructions:
 *                 type: array
 *                 items:
 *                   type: string
 *               required_skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               is_recurring:
 *                 type: boolean
 *               is_certificate_eligible:
 *                 type: boolean
 *               min_hours_for_certificate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Invalid status, past deadline, or invalid fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
 */
router.get('/events/:eventId/qr-token', AdminEventController.generateDynamicQRToken);

/**
 * @route   PATCH /api/admin/events/:id/attendance/:registrationId
 * @desc    Manually update attendance check-in/out times, hours, and status for a specific registered volunteer
 * @swagger
 * /api/admin/events/{id}/attendance/{registrationId}:
 *   patch:
 *     summary: Update attendance by event ID and registration ID
 *     description: Allows admins to adjust attendance check-in/check-out timestamps, logged hours, remarks, or status for a volunteer who registered for the event. Updating check_in_time and check_out_time triggers automated calculation and badge/master-certificate updates in other tables.
 *     tags: [Admin Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The Event UUID
 *         example: "b8908386-8df7-4638-ba0b-d2495b4cb587"
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The Attendance/Registration UUID (attendance_id)
 *         example: "a1234567-89ab-cdef-0123-456789abcdef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [registered, present, absent, withdrawn, waitlisted]
 *                 example: "present"
 *               check_in_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-15T08:00:00.000Z"
 *               check_out_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-15T12:00:00.000Z"
 *               hours_logged:
 *                 type: number
 *                 example: 4.0
 *                 description: "Optional manual override. If check_in_time and check_out_time are provided, the DB trigger trigger_calculate_hours will compute hours automatically."
 *               admin_remarks:
 *                 type: string
 *                 example: "Attended full morning drive; manually marked due to battery issue."
 *     responses:
 *       200:
 *         description: Attendance record updated successfully
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
 *                   example: "Attendance record updated successfully."
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendance_id:
 *                       type: string
 *                       format: uuid
 *                     event_id:
 *                       type: string
 *                       format: uuid
 *                     volunteer_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "present"
 *                     check_in_time:
 *                       type: string
 *                       format: date-time
 *                     check_out_time:
 *                       type: string
 *                       format: date-time
 *                     hours_logged:
 *                       type: number
 *                       example: 4.0
 *                     admin_remarks:
 *                       type: string
 *       400:
 *         description: Invalid UUID format, invalid status enum, or no update fields provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin privileges required)
 *       404:
 *         description: Registration record not found for this event
 *       500:
 *         description: Server error
 */
router.patch('/events/:id/attendance/:registrationId', AdminEventController.updateAttendanceByRegistrationId);

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
 *                   example: "Attendance record updated successfully."
 *       400:
 *         description: Invalid attendance parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin privileges required)
 *       404:
 *         description: Attendance record not found
 *       500:
 *         description: Server error
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
 *         description: Search keyword across title, description, or location
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter events by location name or address
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: ['Teaching & Mentorship', 'Tech & Development', 'Media & Photography', 'Content & Design', 'Wall Painting', 'Core & Planning', 'Other']
 *         description: Filter events by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, completed, cancelled, archived]
 *         description: Filter events by lifecycle status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created
 *         description: Sort field (e.g. 'created', 'date', 'title')
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort ordering direction
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of events to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
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
 *     description: Retrieves a paginated list of all volunteers with search, sorting, and filtering capabilities.
 *     tags: [Admin Volunteers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by volunteer name, email, or phone number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by account status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created
 *         description: Sort field (e.g. 'created', 'name', 'hours', 'activities')
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort ordering direction
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of volunteers per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of volunteers to skip
 *     responses:
 *       200:
 *         description: Volunteers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
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
 *       400:
 *         description: Invalid UUID format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Volunteer not found
 *       500:
 *         description: Server error
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Volunteer not found
 *       500:
 *         description: Server error
 */
router.delete('/volunteers/:id', adminController.deactivateVolunteerAccount);


// ============================================================================
// TASK MANAGEMENT (Core CRUD)
// ============================================================================

/**
 * @route   POST /api/admin/tasks
 * @desc    Create a new task assigned to a volunteer
 * @swagger
 * /api/admin/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Assigns a new task to a specific volunteer, optionally linking it to an event, deadline, and hours awarded.
 *     tags: [Admin Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - assigned_to
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *                 description: Volunteer user UUID
 *               event_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional associated event UUID
 *               description:
 *                 type: string
 *                 description: Detailed task instructions
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Task deadline (must be in future)
 *               hours_awarded:
 *                 type: number
 *                 description: Seva hours granted upon task completion
 *                 default: 0
 *               is_public:
 *                 type: boolean
 *                 default: true
 *                 description: Whether other volunteers can view this task
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Missing title/assignee, invalid deadline, or negative hours
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
 */
router.post('/tasks', AdminTaskController.createNewTask);

/**
 * @route   GET /api/admin/tasks
 * @desc    Get all tasks with filtering
 * @swagger
 * /api/admin/tasks:
 *   get:
 *     summary: List all tasks
 *     description: Retrieves tasks with filtering by event, assignee, status, and pagination.
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter tasks by event UUID
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter tasks by assigned volunteer UUID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [assigned, in_progress, pending_verification, completed, cancelled]
 *         description: Filter tasks by current status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: Tasks listed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       500:
 *         description: Server error
 */
router.get('/tasks', AdminTaskController.listTasks);

/**
 * @route   GET /api/admin/tasks/:id
 * @desc    Get task details and timeline
 * @swagger
 * /api/admin/tasks/{id}:
 *   get:
 *     summary: Get task details and timeline
 *     description: Retrieves details of a specific task along with its full timeline history.
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task UUID
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get('/tasks/:id', AdminTaskController.getTaskDetails);

/**
 * @route   PUT /api/admin/tasks/:id
 * @desc    Edit task details
 * @swagger
 * /api/admin/tasks/{id}:
 *   put:
 *     summary: Update task details
 *     description: Modifies details of a task (only allowed for task creator, before completion).
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *               is_public:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Invalid status or reassignment not allowed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden / Unauthorized (only task creator can modify)
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.put('/tasks/:id', AdminTaskController.updateTaskDetails);

/**
 * @route   PATCH /api/admin/tasks/:id/status
 * @desc    Verify or change status (Complete, Cancel, etc.)
 * @swagger
 * /api/admin/tasks/{id}/status:
 *   patch:
 *     summary: Update task status and award hours
 *     description: Allows the admin who created the task to update its status (assigned, in_progress, pending_verification, completed, cancelled), provide remarks, and award volunteer hours.
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [assigned, in_progress, pending_verification, completed, cancelled] }
 *               admin_remarks: { type: string }
 *               hours_awarded: { type: number, description: "Required if status is completed" }
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *       400:
 *         description: Invalid status or invalid hours
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden / Unauthorized (only task creator can change status)
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch('/tasks/:id/status', AdminTaskController.changeTaskStatus);

/**
 * @route   DELETE /api/admin/tasks/:id
 * @desc    Soft-delete a task
 * @swagger
 * /api/admin/tasks/{id}:
 *   delete:
 *     summary: Soft-delete a task
 *     description: Marks a task as deleted (only allowed for task creator).
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task UUID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden / Unauthorized (only task creator can delete)
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.delete('/tasks/:id', AdminTaskController.deleteTask);

/**
 * @route   PATCH /api/admin/tasks/:id/progress
 * @desc    Update progress if the admin is the assignee
 * @swagger
 * /api/admin/tasks/{id}/progress:
 *   patch:
 *     summary: Update assigned task progress (Admin assignee)
 *     description: Allows the assigned admin to mark a task as in_progress or pending_verification.
 *     tags: [Admin Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [in_progress, pending_verification]
 *               volunteer_remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden / Unauthorized (only assigned user can update progress)
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch('/tasks/:id/progress', AdminTaskController.updateMyProgress);

module.exports = router;