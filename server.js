const app = require('./src/app');
const { pool } = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

async function startServer() {
    // Verify Database connection before firing up the web server
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL Connection verified successfully.');
    } catch (err) {
        console.warn('⚠️ PostgreSQL connection could not be established on startup:', err.message);
        console.warn('⚠️ Server will run with database mock/fallback active.');
    }

    // Start Listening for HTTP requests on 0.0.0.0:5000
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Production server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Handle clean termination signals (e.g., stopping the server safely)
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received. Shutting down gracefully...');
        server.close(() => {
            if (pool && typeof pool.end === 'function') {
                pool.end(() => {
                    console.log('Database connections closed. Process terminated.');
                });
            } else {
                console.log('Process terminated.');
            }
        });
    });
}

startServer();
