const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Route for volunteer registration
router.post('/register', authController.register);

// Route for logging in
router.post('/login', authController.login);

// Route for changing password (requires authentication)
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;