const path = require('path');
const dotenv = require('dotenv');

// 1. Initialize dotenv at the VERY TOP before any other modules load environment variables
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

// Middleware
app.use(cors());
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Expense Tracker API Server is running smoothly',
    database: 'MongoDB Atlas Connected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 [Express] Server running on port ${PORT}`);
  });
};

startServer();
