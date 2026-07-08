const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Route to publish a new structural seva event
router.post('/events', verifyToken, isAdmin, adminController.createNewEvent);

// Route to view specific applied volunteer rosters and logs for an event
router.get('/events/:eventId/report', verifyToken, isAdmin, adminController.getEventReport);

// Route to fetch quick high-level summary cards for the Samithi stats page
router.get('/summary-stats', verifyToken, isAdmin, adminController.getSamithiOverview);

module.exports = router;