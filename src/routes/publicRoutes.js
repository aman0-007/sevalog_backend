const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public route to fetch the next upcoming event
// URL will be: GET /api/public/latest-event
router.get('/latest-event', publicController.getLatestUpcomingEvent);

module.exports = router;