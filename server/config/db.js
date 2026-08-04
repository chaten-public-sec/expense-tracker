const mongoose = require('mongoose');
const {
  sanitizeUri,
  auditConnectionUri,
  runNetworkDiagnostics,
  categorizeMongoError
} = require('../utils/dbDiagnostics');

const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!rawUri || typeof rawUri !== 'string' || !rawUri.trim()) {
    console.error('\n==================================================');
    console.error('❌ Missing Environment Variable: MONGODB_URI is undefined or empty.');
    console.error('Action: Define MONGODB_URI in server/.env file.');
    console.error('==================================================\n');
    process.exit(1);
  }

  const uri = rawUri.trim();
  const sanitized = sanitizeUri(uri);

  console.log('\n==================================================');
  console.log('🔍 MongoDB Connection Audit & Pre-flight Diagnostics');
  console.log(`Connection URI: ${sanitized}`);

  // 1. Audit connection URI structure
  const uriAudit = auditConnectionUri(uri);
  if (uriAudit.dbName) {
    console.log(`Database Name:  "${uriAudit.dbName}"`);
  }
  if (uriAudit.warnings.length > 0) {
    uriAudit.warnings.forEach(warn => console.log(`⚠️  Warning: ${warn}`));
  }

  // 2. Pre-flight Network Diagnostics (DNS & TCP Socket)
  console.log('📡 Testing Network Access (DNS SRV + Port 27017)...');
  const networkDiag = await runNetworkDiagnostics(uriAudit.host);

  if (networkDiag.dnsSuccess) {
    console.log('✅ DNS Resolution: SUCCESS');
  } else {
    console.log(`❌ DNS Resolution: FAILED (${networkDiag.errorMessage})`);
  }

  if (networkDiag.tcpSuccess) {
    console.log('✅ TCP Socket Port 27017: REACHABLE');
  } else if (networkDiag.dnsSuccess) {
    console.log(`⚠️  TCP Socket Port 27017: TIMED OUT / BLOCKED (${networkDiag.errorMessage})`);
  }
  console.log('==================================================\n');

  // 3. Register Mongoose Event Listeners
  mongoose.connection.removeAllListeners();

  mongoose.connection.on('connected', () => {
    console.log(`[Mongoose Event] Connected to database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Mongoose Event] Connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[Mongoose Event] Disconnected from database');
  });

  // 4. Attempt Connection with timeout configuration
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    console.log('==================================================');
    console.log(`✅ Database Connected: ${conn.connection.host}`);
    console.log(`Active DB Name:    ${conn.connection.name}`);
    console.log('==================================================\n');

    return conn;
  } catch (error) {
    const diag = categorizeMongoError(error, networkDiag);

    console.error('\n==================================================');
    console.error(diag.title);
    console.error(`Category: ${diag.category}`);
    console.error(`Error:    ${error.message}`);
    console.error(`👉 Required Action: ${diag.action}`);
    console.error('==================================================\n');

    process.exit(1);
  }
};

module.exports = connectDB;
