const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// 1. Import Swagger Packages
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { SwaggerTheme, SwaggerThemeNameEnum } = require('swagger-themes');
const theme = new SwaggerTheme();

const authRoutes = require('./routes/authRoutes'); 
const volunteerRoutes = require('./routes/volunteerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Security & Logging Middlewares
app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('dev'));

// Body Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// SWAGGER CONFIGURATION
// ==========================================
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Chembur Samithi Seva API',
            version: '1.0.0',
            description: 'API documentation for the Volunteer Management System',
        },
        servers: [
            {
                url: '/',
                description: 'Development Server',
            },
        ],
        tags: [
            // 1. Auth
            {
                name: 'Auth',
                description: 'User registration, login, token management, password resets, and session profile (/api/auth/me)'
            },
            // 2. Public
            {
                name: 'Public',
                description: 'Public landing page endpoints, published event discovery, and open certificate verification & download'
            },
            // 3. Volunteer (profile, dashboard, events, attendance, certificates, tasks)
            {
                name: 'Volunteer Profile',
                description: 'Volunteer profile retrieval, avatar upload, and personal detail updates'
            },
            {
                name: 'Volunteer Dashboard',
                description: 'Volunteer metrics matrix, impact hours, community activities feed, and leaderboards'
            },
            {
                name: 'Volunteer Events',
                description: 'Event catalog exploration, registration, and withdrawal'
            },
            {
                name: 'Volunteer Attendance',
                description: 'Dynamic QR token attendance check-in and check-out scanning'
            },
            {
                name: 'Volunteer Certificates',
                description: 'Earned certificates listing and frontend canvas/print download payload'
            },
            {
                name: 'Volunteer Tasks',
                description: 'Assigned and public task queue, status progression, and timeline tracking'
            },
            // 4. Admin (dashboard, events, attendance, volunteers, tasks)
            {
                name: 'Admin Dashboard',
                description: 'Executive KPI metrics, organizational statistics, leaderboards, and system timelines'
            },
            {
                name: 'Admin Events',
                description: 'Event lifecycle management (creation, publishing, completion, dynamic QR issuance, manual attendance override)'
            },
            {
                name: 'Admin Volunteers',
                description: 'Volunteer registry management, search, filtering, and deactivation'
            },
            {
                name: 'Admin Tasks',
                description: 'Task assignment, review, approval, status transitions, and timeline logging'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Order route files explicitly: Auth -> Public -> Volunteer -> Admin
    apis: [
        path.join(__dirname, './routes/authRoutes.js'),
        path.join(__dirname, './routes/publicRoutes.js'),
        path.join(__dirname, './routes/volunteerRoutes.js'),
        path.join(__dirname, './routes/adminRoutes.js'),
    ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const swaggerUiOptions = {
    explorer: true,
    customCss: theme.getBuffer('material'),
    swaggerOptions: {
        operationsSorter: 'alpha',
        tagsSorter: null // Preserves our custom defined tags array ordering
    }
};

// Serve the Swagger UI at /api-docs
app.use(['/api/api-docs', '/api-docs'], swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));
// ==========================================


// Root redirect to Swagger API Documentation
app.get(['/', '/api'], (req, res) => {
    res.redirect('/api/api-docs');
});

// Base Health Check Route
app.get(['/api/health', '/health'], (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// API Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../404.html'));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
        }
    });
});

module.exports = app;
