const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/authModel');

// Helper function to generate tokens
const generateToken = (user) => {
    return jwt.sign(
        { userId: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' } // Token expires in 1 day
    );
};

const authController = {
    /**
     * Handle new volunteer registration
     */
    register: async (req, res, next) => {
        try {
            const { firstName, lastName, email, password, phoneNumber } = req.body;

            // 1. Check if user already exists
            const existingUser = await AuthModel.checkUserExists(email, phoneNumber);
            if (existingUser) return res.status(409).json({ error: `An active account with this ${existingUser.email === email ? 'email' : 'phone number'} already exists.` });

            // 2. Hash the password (Salt rounds = 10)
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // 3. Save to database
            const newUser = await AuthModel.createVolunteer({
                firstName, lastName, email, passwordHash, phoneNumber
            });

            // 4. Generate login token
            const token = generateToken(newUser);

            res.status(201).json({
                message: 'Account created successfully',
                token,
                user: {
                    userId: newUser.user_id,
                    firstName: newUser.first_name,
                    lastName: newUser.last_name,
                    email: newUser.email,
                    role: newUser.role
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Handle user login (both Admin and Volunteer)
     */
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            // 1. Find user by email
            const user = await AuthModel.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // 2. Compare the provided password with the stored hash
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }

            // 3. Generate login token
            const token = generateToken(user);

            // 4. Send response (excluding the password hash)
            res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    userId: user.user_id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * Handle password change for logged-in users
     */
    changePassword: async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;

            const user = await AuthModel.getUserById(userId);
            if (!user) return res.status(404).json({ error: 'User not found.' });

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Incorrect current password.' });
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);

            await AuthModel.updatePassword(userId, passwordHash);

            res.status(200).json({ message: 'Password updated successfully.' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = authController;