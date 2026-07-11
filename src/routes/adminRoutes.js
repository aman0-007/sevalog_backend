const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Route to publish a new structural seva event
router.post('/events', verifyToken, isAdmin, adminController.createNewEvent);

// Route to view all published seva events
router.get('/events', verifyToken, isAdmin, adminController.getAllEvents);

// Route to view specific applied volunteer rosters and logs for an event
router.get('/events/:eventId/report', verifyToken, isAdmin, adminController.getEventReport);

// Route to fetch quick high-level summary cards for the Samithi stats page
router.get('/summary-stats', verifyToken, isAdmin, adminController.getSamithiOverview);

// Route to view all registered volunteers
router.get('/volunteers', verifyToken, isAdmin, adminController.getAllVolunteers);

// Route to view a single volunteer's full profile
router.get('/volunteers/:userId', verifyToken, isAdmin, adminController.getVolunteerProfile);

// Route to mark attendance for a specific volunteer at a specific event
router.post('/events/:eventId/attendance', verifyToken, isAdmin, adminController.logVolunteerAttendance);

module.exports = router;