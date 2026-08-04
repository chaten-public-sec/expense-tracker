const path = require('path');
const dotenv = require('dotenv');

// 1. Initialize dotenv at the VERY TOP before any other module imports
const envPath = path.resolve(__dirname, '.env');
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.warn(`[dotenv] Warning loading .env file from ${envPath}:`, dotenvResult.error.message);
}

// 2. Validate essential environment variables
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri || typeof mongoUri !== 'string' || !mongoUri.trim()) {
  console.error('\n==================================================');
  console.error('❌ Missing Environment Variable: MONGODB_URI is undefined or empty');
  console.error(`Please define MONGODB_URI in ${envPath}`);
  console.error('==================================================\n');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

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

// API Routes registered under /api
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Fallback Route Aliases (Handles requests if /api prefix was omitted in client config)
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/expenses', expenseRoutes);
app.use('/settlements', settlementRoutes);
app.use('/dashboard', dashboardRoutes);

// Health check endpoint for Render / Vercel uptime checks
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins: isDev ? 'development (all permitted)' : allowedOrigins,
    message: 'Expense Tracker API Server is running smoothly',
    database: 'MongoDB Atlas Connected',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is healthy' });
});

// Production Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Start Server after DB Connection attempt
const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`🚀 [Express] Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
    console.log(`🌐 [CORS] Allowed Origins: ${isDev ? 'Development' : allowedOrigins.join(', ')}`);
  });

  // Graceful shutdown handling for Render / Docker containers
  const gracefulShutdown = (signal) => {
    console.log(`\n[Server] ${signal} signal received. Closing HTTP server gracefully...`);
    server.close(() => {
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
