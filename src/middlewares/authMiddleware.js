const jwt = require('jsonwebtoken');

const authMiddleware = {
    /**
     * Verifies that the user is logged in (has a valid token)
     */
    verifyToken: (req, res, next) => {
        // Tokens are usually sent in the Authorization header: "Bearer <token>"
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No valid token provided.' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // Verify the token using your secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Attach the user info (userId, role) to the request object
            req.user = decoded; 
            
            next(); // Move on to the controller
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
        }
    },

    /**
     * Verifies that the logged-in user is an Administrator
     */
    isAdmin: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        next();
    }
};

module.exports = authMiddleware;