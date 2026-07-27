const jwt = require('jsonwebtoken');

const authMiddleware = {
    /**
     * Verifies that the user is logged in (has a valid token)
     */
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No valid token provided.' 
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; 
            next(); 
        } catch (error) {
            // Differentiate errors for better frontend UX
            const message = error.name === 'TokenExpiredError' 
                ? 'Session expired. Please log in again.' 
                : 'Invalid token. Please log in again.';
                
            return res.status(401).json({ success: false, message });
        }
    },

    /**
     * Verifies that the logged-in user is an Administrator
     */
    isAdmin: (req, res, next) => {
        // Safety check prevents server crash if verifyToken is missing from the route chain
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }
        next();
    },

    /**
     * Verifies that the logged-in user is a Volunteer
     */
    isVolunteer: (req, res, next) => {
        if (!req.user || req.user.role !== 'volunteer') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Volunteer privileges required.' 
            });
        }
        next();
    }
};

module.exports = authMiddleware;