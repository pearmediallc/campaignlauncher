const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

const db = require('./models');
const PermissionService = require('./services/PermissionService');
const campaignRoutes = require('./routes/campaigns');
const adRoutes = require('./routes/ads');
const mediaRoutes = require('./routes/media');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dataDeletionRoutes = require('./routes/dataDeletion');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute (very permissive for dev)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain endpoints that are called frequently
    const whitelist = ['/api/resources/current', '/api/auth/me', '/api/auth/facebook/status'];
    return whitelist.some(path => req.path.startsWith(path));
  }
});
app.use('/api/', limiter);

// Auth routes have stricter rate limiting (but still reasonable for dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per 15 minutes for development
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth state management
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 1000 * 60 * 15 // 15 minutes
  }
}));

// Multer configuration moved to individual route files
// This avoids conflicts and allows route-specific upload settings

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/facebook', require('./routes/facebookAuth'));
app.use('/api/auth/facebook-sdk', require('./routes/facebookSDKAuth'));
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/media', mediaRoutes);

// New resource management routes (separate from existing auth)
app.use('/api/resources', require('./routes/resourceManager'));

// Data deletion endpoints (required for Facebook App Review)
app.use('/api/data-deletion', dataDeletionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Facebook Campaign Launcher API is running' });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function startServer() {
  try {
    // Ensure database integrity before starting
    const ensureDatabase = require('./scripts/ensure-database');
    await ensureDatabase();
    
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // IMPORTANT: We use migrations instead of sync to prevent schema conflicts
    // Comment out sync to avoid automatic table creation/alteration
    // await db.sequelize.sync({ alter: false });
    // console.log('Database models synchronized.');
    
    // Run pending migrations
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      console.log('Running database migrations...');
      const { stdout, stderr } = await execPromise('npx sequelize-cli db:migrate');
      if (stdout) console.log('Migration output:', stdout);
      if (stderr && !stderr.includes('No migrations were executed')) {
        console.error('Migration warnings:', stderr);
      }
    } catch (migrationError) {
      console.log('Migration error:', migrationError.message);
      // Don't fail if migrations are already applied
    }
    
    // Create default roles and permissions (with error handling)
    try {
      await PermissionService.createDefaultRolesAndPermissions();
      console.log('Default roles and permissions created.');
    } catch (permError) {
      console.log('Permissions setup status:', permError.message);
      // Don't fail server startup if permissions already exist
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();