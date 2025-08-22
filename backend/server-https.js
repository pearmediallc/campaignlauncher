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

// CORS configuration with multiple port fallbacks
app.use(cors({
  origin: function (origin, callback) {
    // Common ports that React might use as fallbacks
    const allowedPorts = [
      3000, 3001, 3002, 3003, 3004, 3005,  // React common fallback ports
      3006, 3007, 3008, 3009, 3010,        // Additional fallbacks
      8080, 8081, 8082,                    // Alternative dev ports
      4200,                                 // Angular default
      5173, 5174                            // Vite defaults
    ];
    
    // Generate allowed origins for all protocols and hosts
    const allowedOrigins = [];
    const hosts = ['localhost', '127.0.0.1', 'lvh.me', '0.0.0.0'];
    const protocols = ['http', 'https'];
    
    protocols.forEach(protocol => {
      hosts.forEach(host => {
        allowedPorts.forEach(port => {
          allowedOrigins.push(`${protocol}://${host}:${port}`);
        });
      });
    });
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowing origin ${origin}`);
      return callback(null, true);
    }
    
    // Allow any localhost/127.0.0.1 origin in development (catch-all)
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('lvh.me') ||
          origin.includes('0.0.0.0')) {
        console.log(`✅ CORS: Allowing development origin ${origin}`);
        return callback(null, true);
      }
    }
    
    // Allow ngrok domains for testing
    if (/^https:\/\/[a-z0-9]+[\-a-z0-9]*\.ngrok[\-a-z]*\.(?:io|app)$/.test(origin)) {
      console.log(`✅ CORS: Allowing ngrok origin ${origin}`);
      return callback(null, true);
    }
    
    // Production origins (add your production domains here)
    const productionOrigins = [
      // 'https://yourdomain.com',
      // 'https://app.yourdomain.com'
    ];
    
    if (productionOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log(`❌ CORS: Blocked origin ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
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
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// New resource management routes (separate from existing auth)
app.use('/api/resources', require('./routes/resourceManager'));

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
    console.log(`🔒 HTTPS Server running on https://localhost:${PORT}`);
    console.log('✅ SSL/TLS enabled for secure Facebook authentication');
  });
}

startServer();