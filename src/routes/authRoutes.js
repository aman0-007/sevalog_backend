const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Route for volunteer registration
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new volunteer
 *     description: Creates a new volunteer account in the system.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rahul Sharma"
 *               email:
 *                 type: string
 *                 example: "rahul@example.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       201:
 *         description: Volunteer registered successfully
 *       400:
 *         description: Validation error or email already exists
 *       500:
 *         description: Server error
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Route for logging in
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns a JWT token.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "rahul@example.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Successfully logged in, returns JWT token
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', authController.login);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Route for changing password (requires authentication - inside the app)
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     description: Allows an authenticated user to update their password. Requires a valid JWT token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "SecurePass123!"
 *               newPassword:
 *                 type: string
 *                 example: "NewSecurePass456!"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Incorrect current password
 *       401:
 *         description: Unauthorized (Token missing or invalid)
 *       500:
 *         description: Server error
 */
router.put('/change-password', verifyToken, authController.changePassword);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Route for requesting a password reset link (Public)
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: Generates a password reset token and sends an email to the user.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "rahul@example.com"
 *     responses:
 *       200:
 *         description: Reset link sent to email (if email exists)
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:userId/:token
 * @desc    Route for submitting the new password (Public, but protected by params)
 * @swagger
 * /api/auth/reset-password/{userId}/{token}:
 *   post:
 *     summary: Submit a new password
 *     description: Resets the user's password using the token received via email.
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the user
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The temporary reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "MyBrandNewPass789!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post('/reset-password/:userId/:token', authController.resetPassword);

module.exports = router;