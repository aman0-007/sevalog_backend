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
 *     description: Retrieves the single most immediate upcoming event that is published.
 *     tags: [Public]
 *     security: [] 
 *     responses:
 *       200:
 *         description: Successfully retrieved the latest event
 *       404:
 *         description: No upcoming events found
 *       500:
 *         description: Server error
 */
router.get('/latest-event', publicController.getLatestUpcomingEvent);

/**
 * @route   GET /api/public/events
 * @desc    Public route to fetch all upcoming events (paginated)
 * @swagger
 * /api/public/events:
 *   get:
 *     summary: Fetch all upcoming public events
 *     description: Retrieves a paginated list of all published upcoming events.
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
 *       500:
 *         description: Server error
 */
router.get('/events', publicController.getAllPublicEvents);

/**
 * @route   GET /api/public/events/:id
 * @desc    Public route to view full details of a specific event
 * @swagger
 * /api/public/events/{id}:
 *   get:
 *     summary: Get full details of a specific event
 *     description: Retrieves complete information for a single event based on its ID.
 *     tags: [Public]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The unique identifier of the event
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/events/:id', publicController.getPublicEventById);

module.exports = router;