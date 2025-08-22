const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

const db = require('./models');
const permissionService = require('./services/PermissionService');
const campaignRoutes = require('./routes/campaigns');
const adRoutes = require('./routes/ads');
const mediaRoutes = require('./routes/media');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();

// Security middleware - adjusted for HTTPS
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// VERY PERMISSIVE CORS for development only
app.use(cors({
  origin: true, // Allow ALL origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Required for HTTPS
    httpOnly: true,
    sameSite: 'none', // Required for cross-origin requests
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Facebook Auth Routes - Importing after session middleware
const facebookAuthRoutes = require('./routes/facebookAuth');
app.use('/api/auth/facebook', facebookAuthRoutes);

// Facebook SDK callback route
const facebookSDKRoutes = require('./routes/facebookSDKAuth');
app.use('/api/auth/facebook-sdk', facebookSDKRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database initialization
async function initializeDatabase() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database
    await db.sequelize.sync({ alter: false });
    
    // Initialize default roles and permissions
    await permissionService.createDefaultRolesAndPermissions();
    console.log('Default roles and permissions created.');
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

// HTTPS Server configuration
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certificates/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '../certificates/localhost.crt'))
};

// Start server
async function startServer() {
  await initializeDatabase();
  
  const PORT = process.env.PORT || 5002;
  
  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🔒 HTTPS Server (DEV MODE - PERMISSIVE CORS) running on https://localhost:${PORT}`);
    console.log('⚠️  WARNING: Using permissive CORS - for development only!');
    console.log('✅ SSL/TLS enabled for secure Facebook authentication');
  });
}

startServer();