const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Route for updating volunteer bio fields
router.put('/profile', verifyToken, volunteerController.updateMyProfile);

// Route for getting dashboard metrics (hours, total activities)
router.get('/dashboard', verifyToken, volunteerController.getMyDashboard);

router.get('/events', verifyToken, volunteerController.getEvents);
router.post('/apply', verifyToken, volunteerController.applyToEvent);

// Route to get all events (past and future) with the user's specific status
router.get('/events/all', verifyToken, volunteerController.getAllEventsList);

// Route to get the volunteer's profile data
router.get('/profile', verifyToken, volunteerController.getMyProfile);
module.exports = router;