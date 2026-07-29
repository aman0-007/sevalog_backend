const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/authModel');

// Helper function to generate tokens
const generateToken = (user) => {
    return jwt.sign(
        { userId: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
};

const authController = {
    /**
     * Handle new volunteer registration
     */
    register: async (req, res) => {
        try {
            const { firstName, lastName, email, password, phoneNumber, collegeName, profession } = req.body;

            // 1. Mandatory Data Validation (Prevents DB constraint failure)
            if (!email || !password || !firstName || !lastName) {
                return res.status(400).json({ success: false, message: 'Missing required profile fields.' });
            }
            if (!collegeName && !profession) {
                return res.status(400).json({ success: false, message: 'Either College Name or Profession must be provided.' });
            }

            // 2. Check if user already exists
            const existingUser = await AuthModel.checkUserExists(email, phoneNumber);
            if (existingUser) {
                const conflictField = existingUser.email === email.toLowerCase() ? 'email' : 'phone number';
                return res.status(409).json({ success: false, message: `An active account with this ${conflictField} already exists.` });
            }

            // 3. Hash the password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // 4. Save to database
            const newUser = await AuthModel.createVolunteer({
                firstName, lastName, email, passwordHash, phoneNumber, collegeName, profession
            });

            // 5. Generate login token
            const token = generateToken(newUser);

            return res.status(201).json({
                success: true,
                message: 'Account created successfully',
                data: {
                    token,
                    user: {
                        userId: newUser.user_id,
                        firstName: newUser.first_name,
                        lastName: newUser.last_name,
                        email: newUser.email,
                        role: newUser.role
                    }
                }
            });

        } catch (error) {
            console.error('[Auth Register Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to register account.' });
        }
    },

    /**
     * Handle user login
     */
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required.' });
            }

            // 1. Find user by email
            const user = await AuthModel.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }

            // 2. Compare the provided password with the stored hash
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }

            // 3. Generate login token
            const token = generateToken(user);

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        userId: user.user_id,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        email: user.email,
                        role: user.role
                    }
                }
            });

        } catch (error) {
            console.error('[Auth Login Error]:', error);
            return res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    },

    /**
     * Handle password change for logged-in users
     */
    changePassword: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ success: false, message: 'Both current and new passwords are required.' });
            }

            const user = await AuthModel.getUserByIdForAuth(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: 'Incorrect current password.' });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);

            await AuthModel.updatePassword(userId, passwordHash);

            return res.status(200).json({ success: true, message: 'Password updated successfully.' });
        } catch (error) {
            console.error('[Auth Change Password Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to update password.' });
        }
    },


    /**
     * Step 1: Request Password Reset Link (Forgot Password)
     */
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ success: false, message: "Email is required." });
            }

            // 1. Verify if user exists
            const user = await AuthModel.getUserByEmail(email);
            if (!user) {
                // Security Best Practice: Do not reveal if the email exists or not to prevent user enumeration
                return res.status(200).json({ 
                    success: true, 
                    message: "If an account with that email exists, a password reset link has been sent." 
                });
            }

            // 2. Create a One-Time Use Dynamic Secret
            // By appending the user's current password hash, this token will instantly expire once the password is reset.
            const secret = process.env.JWT_SECRET + user.password_hash;
            
            const payload = {
                userId: user.user_id,
                email: user.email
            };

            // 3. Generate a 15-minute token
            const token = jwt.sign(payload, secret, { expiresIn: '15m' });

            // 4. Construct the reset link (Adapt FRONTEND_URL to your actual frontend domain)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetLink = `${frontendUrl}/reset-password/${user.user_id}/${token}`;

            // TODO: In production, integrate Nodemailer, SendGrid, or AWS SES here to email the 'resetLink' to user.email
            console.log(`[DEV ONLY] Password Reset Link for ${user.email}:`, resetLink);

            return res.status(200).json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent.",
                // NOTE: Remove `resetLink` from the JSON response before pushing to production!
                dev_reset_link: resetLink 
            });

        } catch (error) {
            console.error('[Forgot Password Error]:', error);
            return res.status(500).json({ success: false, message: "Server error during password reset request." });
        }
    },

    /**
     * Step 2: Validate Token and Update Password (Reset Password)
     */
    resetPassword: async (req, res) => {
        try {
            const { userId, token } = req.params;
            const { newPassword } = req.body;

            if (!newPassword) {
                return res.status(400).json({ success: false, message: "New password is required." });
            }

            // 1. Verify user exists
            const user = await AuthModel.getUserByIdForAuth(userId);
            if (!user) {
                return res.status(400).json({ success: false, message: "Invalid or expired password reset link." });
            }

            // 2. Recreate the dynamic secret to verify the token
            const secret = process.env.JWT_SECRET + user.password_hash;

            try {
                // 3. Verify the token
                jwt.verify(token, secret);
            } catch (err) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Password reset link is invalid or has expired." 
                });
            }

            // 4. Token is valid, hash the new password
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);

            // 5. Update the database
            await AuthModel.updatePassword(userId, newPasswordHash);

            return res.status(200).json({ 
                success: true, 
                message: "Password has been successfully reset. You can now log in." 
            });

        } catch (error) {
            console.error('[Reset Password Error]:', error);
            return res.status(500).json({ success: false, message: "Server error during password reset." });
        }
    }
};

module.exports = authController;