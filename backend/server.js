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
const variationsRoutes = require('./routes/variations');

const app = express();

// Trust proxy for Render deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware with CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://connect.facebook.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://graph.facebook.com", "https://www.facebook.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.facebook.com"]
    }
  }
}));

// CORS configuration - Allow configured origins including Ad Forge
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Parse allowed origins from environment variable
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map(url => url.trim());
    
    // Always allow localhost in development
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:8080');
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies for session management
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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

// IMPORTANT: Specific routes must come BEFORE general routes to avoid pattern matching conflicts
// Strategy 1-50-1 routes (must be before general campaigns route)
app.use('/api/campaigns/strategy-150', require('./routes/strategy150'));

// Campaign management routes (must be before general campaigns route)
app.use('/api/campaigns/manage', require('./routes/campaignManagement'));

// General campaign routes (must be AFTER specific campaign routes)
app.use('/api/campaigns', campaignRoutes);

app.use('/api/ads', adRoutes);
app.use('/api/media', mediaRoutes);

// New resource management routes (separate from existing auth)
app.use('/api/resources', require('./routes/resourceManager'));

// Variations import routes for Ad Scraper integration
app.use('/api/variations', variationsRoutes);

// Image proxy routes for external image downloads
app.use('/api/images', require('./routes/images'));

// Data deletion endpoints (required for Facebook App Review)
app.use('/api/data-deletion', dataDeletionRoutes);

// Campaign templates routes
app.use('/api/templates', require('./routes/templates'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Facebook Campaign Launcher API is running' });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');

  console.log('=== Render Directory Info ===');
  console.log('Current working directory (process.cwd()):', process.cwd());
  console.log('Current file directory (__dirname):', __dirname);

  // Try multiple possible paths for the frontend build
  const possiblePaths = [
    path.join(__dirname, '../frontend/build'),
    path.join(process.cwd(), 'frontend/build'),
    path.join(process.cwd(), '../frontend/build'),
    '/opt/render/project/src/frontend/build'
  ];

  let frontendBuildPath = null;
  for (const tryPath of possiblePaths) {
    console.log(`Checking path: ${tryPath} - exists: ${fs.existsSync(tryPath)}`);
    if (fs.existsSync(tryPath)) {
      frontendBuildPath = tryPath;
      console.log(`✓ Found frontend build at: ${frontendBuildPath}`);
      break;
    }
  }

  if (!frontendBuildPath) {
    console.error('❌ Frontend build not found in any expected location!');
    console.log('Directory listing of current dir:', fs.readdirSync(process.cwd()));
    console.log('Directory listing of parent:', fs.readdirSync(path.join(process.cwd(), '..')));
    frontendBuildPath = path.join(__dirname, '../frontend/build'); // Fallback
  }
  console.log('=========================');

  // Serve static files from React build
  app.use(express.static(frontendBuildPath));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('Frontend build not found at:', indexPath);
      res.status(404).json({
        error: 'Frontend not built. Please run build script.',
        attemptedPath: indexPath,
        currentDir: __dirname,
        cwd: process.cwd()
      });
    }
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
      const migrationEnv = process.env.NODE_ENV === 'production' ? 'NODE_ENV=production ' : '';
      const { stdout, stderr } = await execPromise(`${migrationEnv}npx sequelize-cli db:migrate`);
      if (stdout) console.log('Migration output:', stdout);
      if (stderr && !stderr.includes('No migrations were executed')) {
        console.error('Migration warnings:', stderr);
      }
      console.log('Migrations completed or already up to date.');
      
      // Run seeders to create admin user
      console.log('Running database seeders...');
      const { stdout: seedStdout, stderr: seedStderr } = await execPromise(`${migrationEnv}npx sequelize-cli db:seed:all`);
      if (seedStdout) console.log('Seeder output:', seedStdout);
      if (seedStderr && !seedStderr.includes('already exists')) {
        console.error('Seeder warnings:', seedStderr);
      }
    } catch (migrationError) {
      console.error('Migration/Seeder error details:', migrationError);
      // Continue anyway - migrations might already be applied
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