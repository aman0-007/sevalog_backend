const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for volunteer registration
router.post('/register', authController.register);

// Route for logging in
router.post('/login', authController.login);

module.exports = router;