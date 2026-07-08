const app = require('./src/app');
const { pool } = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Verify Database connection before firing up the web server
pool.query('SELECT NOW()')
    .then(() => {
        console.log('✅ PostgreSQL Connection verified successfully.');
        
        // Start Listening for HTTP requests
        const server = app.listen(PORT, () => {
            console.log(`🚀 Production server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });

        // Handle clean termination signals (e.g., stopping the server safely)
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received. Shutting down gracefully...');
            server.close(() => {
                pool.end(() => {
                    console.log('Database connections closed. Process terminated.');
                });
            });
        });
    })
    .catch(err => {
        console.error('❌ Failed to connect to database on startup:', err.message);
        process.exit(1);
    });