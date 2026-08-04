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

// Disable x-powered-by header for security
app.disable('x-powered-by');

// Environment-driven CORS configuration
const isDev = (process.env.NODE_ENV || 'development').toLowerCase() === 'development';
const clientUrl = process.env.CLIENT_URL;

// Support comma-separated origins if multiple frontend URLs are configured
const configuredOrigins = clientUrl ? clientUrl.split(',').map(url => url.trim()) : [];

const allowedOrigins = isDev
  ? [
      ...configuredOrigins,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ].filter(Boolean)
  : configuredOrigins;

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (mobile apps, curl, server-to-server) or matched origins
    if (!origin || allowedOrigins.includes(origin) || isDev) {
      return callback(null, true);
    }
    return callback(new Error(`CORS restriction: Origin ${origin} not permitted`));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route Imports
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint for Render / Uptime monitors
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    message: 'Expense Tracker API Server is running smoothly',
    database: 'MongoDB Atlas Connected',
    timestamp: new Date().toISOString()
  });
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
