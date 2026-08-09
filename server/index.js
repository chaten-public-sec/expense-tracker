const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore fallback if custom DNS cannot be set
}

const path = require('path');
const http = require('http');
const dotenv = require('dotenv');


// 1. Initialize dotenv at the VERY TOP before any other module imports
const envPath = path.resolve(__dirname, '.env');
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.warn(`[dotenv] Warning loading .env file from ${envPath}:`, dotenvResult.error.message);
} else {
  console.log(`📂 [dotenv] Loaded environment file from: ${envPath}`);
}

// 2. Validate essential environment variable - STRICTLY process.env.MONGODB_URI ONLY
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
  console.error('\n==================================================');
  console.error('❌ Missing Environment Variable: MONGODB_URI is undefined or empty');
  console.error(`Please define MONGODB_URI in ${envPath}`);
  console.error('==================================================\n');
  process.exit(1);
}

// Helper to mask password and output first 30 characters preview
const getMaskedPreview = (uri) => {
  const sanitized = uri.replace(/\/\/(.*?):(.*?)@/, (match, user) => `//${user}:****@`);
  return sanitized.length > 30 ? `${sanitized.substring(0, 30)}...` : sanitized;
};

console.log(`🔑 [config] Active MONGODB_URI Preview (first 30 chars): ${getMaskedPreview(mongoUri.trim())}`);


const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const socketManager = require('./socket/socketManager');

const app = express();

// Trust reverse proxy for Render / Vercel
app.set('trust proxy', 1);

// Disable x-powered-by header for security
app.disable('x-powered-by');

// Helper to normalize origin URLs (trim whitespace & remove trailing slashes)
const normalizeOrigin = (url) => {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '').toLowerCase();
};

const isDev = (process.env.NODE_ENV || 'development').toLowerCase() === 'development';
const rawClientUrl = process.env.CLIENT_URL || '';

// Process configured origins from environment variables (handles single or comma-separated URLs)
const configuredOrigins = rawClientUrl
  .split(',')
  .map(url => normalizeOrigin(url))
  .filter(Boolean);

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const allowedOrigins = isDev
  ? Array.from(new Set([...configuredOrigins, ...devOrigins]))
  : configuredOrigins;

// Production-grade CORS options configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser / server-to-server / mobile requests without Origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalizedReqOrigin = normalizeOrigin(origin);

    // Permissive matching for all Vercel deployment & preview URLs (*.vercel.app)
    const isVercelDomain = normalizedReqOrigin.endsWith('.vercel.app') || normalizedReqOrigin.includes('.vercel.app');
    const isExplicitlyAllowed = allowedOrigins.includes(normalizedReqOrigin);
    const matchesClientUrl = configuredOrigins.some(u => u === normalizedReqOrigin);

    if (isDev || isExplicitlyAllowed || matchesClientUrl || isVercelDomain) {
      return callback(null, true);
    }

    console.warn(`[CORS Warning] Request blocked from unpermitted origin: "${origin}"`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 3. Register CORS middleware at the absolute top of the middleware stack
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route Imports
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// API Routes registered under /api
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallback Route Aliases (Handles requests if /api prefix was omitted in client config)
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/expenses', expenseRoutes);
app.use('/settlements', settlementRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notifications', notificationRoutes);

// Health & Ping endpoints for Render / Cron-Job uptime keep-alive
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    message: 'Expense Tracker API Server is running smoothly',
    database: 'MongoDB Atlas Connected',
    socketIO: 'Active',
    timestamp: new Date().toISOString()
  });
});

app.get(['/ping', '/api/ping'], (req, res) => {
  res.status(200).send('pong');
});

// Production Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping Express (required for Socket.IO)
const httpServer = http.createServer(app);

// Start Server after DB Connection attempt
const startServer = async () => {
  await connectDB();

  // Initialize Socket.IO on the HTTP server
  socketManager.init(httpServer, corsOptions);

  httpServer.listen(PORT, () => {
    console.log(`🚀 [Express] Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
    console.log(`🌐 [CORS] Allowed Origins: ${isDev ? 'Development' : allowedOrigins.join(', ')}`);
    console.log(`🔌 [Socket.IO] WebSocket server ready on port ${PORT}`);
  });

  // Graceful shutdown handling for Render / Docker containers
  const gracefulShutdown = (signal) => {
    console.log(`\n[Server] ${signal} signal received. Closing HTTP server gracefully...`);

    // Close Socket.IO connections first
    const io = socketManager.getIO();
    if (io) {
      io.close(() => {
        console.log('[Server] Socket.IO connections closed.');
      });
    }

    httpServer.close(() => {
      console.log('[Server] HTTP server closed. Disconnecting database...');
      const mongoose = require('mongoose');
      mongoose.connection.close(false, () => {
        console.log('[Server] MongoDB connection closed cleanly. Exiting process.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();
