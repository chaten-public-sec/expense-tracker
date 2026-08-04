const dns = require('dns').promises;
const net = require('net');

/**
 * Sanitizes connection URI to prevent password leakage in logs.
 */
const sanitizeUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/(.*?):(.*?)@/, (match, user, pass) => {
    return `//${user}:****@`;
  });
};

/**
 * Audit and validate MongoDB URI format and query options.
 */
const auditConnectionUri = (uri) => {
  const audit = {
    isValidFormat: false,
    scheme: null,
    username: null,
    hasPassword: false,
    host: null,
    dbName: null,
    hasRetryWrites: false,
    hasWMajority: false,
    warnings: []
  };

  if (!uri || typeof uri !== 'string') {
    audit.warnings.push('MONGODB_URI environment variable is missing or not a string.');
    return audit;
  }

  const trimmed = uri.trim();

  // Check scheme
  if (trimmed.startsWith('mongodb+srv://')) {
    audit.scheme = 'mongodb+srv';
    audit.isValidFormat = true;
  } else if (trimmed.startsWith('mongodb://')) {
    audit.scheme = 'mongodb';
    audit.isValidFormat = true;
  } else {
    audit.warnings.push('URI does not start with a valid scheme (mongodb:// or mongodb+srv://)');
    return audit;
  }

  // Parse credentials and host
  try {
    const withoutScheme = trimmed.replace(/^(mongodb\+srv:\/\/|mongodb:\/\/)/, '');
    const atSplit = withoutScheme.split('@');

    if (atSplit.length > 1) {
      const credentials = atSplit[0];
      const hostAndRest = atSplit.slice(1).join('@');

      const userPass = credentials.split(':');
      audit.username = decodeURIComponent(userPass[0] || '');
      audit.hasPassword = userPass.length > 1 && userPass[1].length > 0;

      // Check URL encoding for special characters in password
      if (userPass.length > 1) {
        const rawPass = userPass[1];
        if (/[@:#\/?$%=+&]/.test(rawPass) && rawPass.includes('%')) {
          // Contains unencoded special characters
          audit.warnings.push('Password contains special characters that may need URL-encoding.');
        }
      }

      const slashSplit = hostAndRest.split('/');
      audit.host = slashSplit[0];

      if (slashSplit.length > 1) {
        const dbAndQuery = slashSplit[1].split('?');
        audit.dbName = dbAndQuery[0] || null;

        if (dbAndQuery.length > 1) {
          const query = dbAndQuery[1];
          audit.hasRetryWrites = query.includes('retryWrites=true');
          audit.hasWMajority = query.includes('w=majority');
        }
      }
    } else {
      audit.warnings.push('No credentials or host separator (@) found in URI.');
    }
  } catch (err) {
    audit.warnings.push(`URI Parsing error: ${err.message}`);
  }

  if (!audit.dbName) {
    audit.warnings.push('No explicit database name found in URI path (defaults to "test").');
  }

  return audit;
};

/**
 * Pre-flight network diagnostics (DNS + TCP Socket).
 */
const runNetworkDiagnostics = async (host) => {
  const result = {
    dnsSuccess: false,
    srvRecords: [],
    tcpSuccess: false,
    errorStage: null,
    errorMessage: null
  };

  if (!host) {
    result.errorStage = 'DNS';
    result.errorMessage = 'No host provided for network diagnostics';
    return result;
  }

  // 1. Test DNS SRV Resolution
  try {
    const srvName = `_mongodb._tcp.${host}`;
    const srvRecords = await dns.resolveSrv(srvName);
    result.dnsSuccess = true;
    result.srvRecords = srvRecords;
  } catch (dnsErr) {
    // If SRV failed, test standard A record lookup
    try {
      await dns.lookup(host);
      result.dnsSuccess = true;
    } catch (lookupErr) {
      result.errorStage = 'DNS';
      result.errorMessage = `DNS resolution failed for host "${host}": ${dnsErr.message}`;
      return result;
    }
  }

  // 2. Test TCP Socket Connection to target host
  let targetHost = host;
  let targetPort = 27017;

  if (result.srvRecords && result.srvRecords.length > 0) {
    targetHost = result.srvRecords[0].name;
    targetPort = result.srvRecords[0].port || 27017;
  }

  try {
    await new Promise((resolve, reject) => {
      const socket = net.connect({ host: targetHost, port: targetPort });
      socket.setTimeout(4000);

      socket.on('connect', () => {
        result.tcpSuccess = true;
        socket.end();
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`TCP Socket timeout (4000ms) to ${targetHost}:${targetPort}`));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  } catch (tcpErr) {
    result.errorStage = 'TCP';
    result.errorMessage = `TCP connection blocked to ${targetHost}:${targetPort}: ${tcpErr.message}`;
  }

  return result;
};

/**
 * Categorize error into specific, actionable diagnostics.
 */
const categorizeMongoError = (error, networkDiag) => {
  const msg = error.message || '';
  const name = error.name || '';
  const code = error.code;

  if (code === 8000 || msg.includes('AuthenticationFailed') || msg.includes('auth failed') || msg.includes('bad auth')) {
    return {
      category: 'INVALID_CREDENTIALS',
      title: '❌ Invalid Database Credentials',
      action: 'Check database username and password in server/.env. Ensure special characters in password are URL-encoded.'
    };
  }

  if (networkDiag && !networkDiag.dnsSuccess) {
    return {
      category: 'DNS_FAILURE',
      title: '❌ DNS Resolution Failure',
      action: `Your system/network DNS cannot resolve "${networkDiag.errorMessage}". Check internet connection or DNS provider.`
    };
  }

  if ((networkDiag && networkDiag.dnsSuccess && !networkDiag.tcpSuccess) || name === 'MongooseServerSelectionError' || msg.includes('timed out') || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
    return {
      category: 'IP_WHITELIST_OR_FIREWALL',
      title: '❌ IP Whitelist or Network Firewall Block',
      action: 'MongoDB Atlas is blocking the connection. Add 0.0.0.0/0 under "Network Access" in your MongoDB Atlas Console, or check local firewall port 27017.'
    };
  }

  if (msg.includes('paused') || msg.includes('replica set') || msg.includes('No primary found')) {
    return {
      category: 'CLUSTER_PAUSED_OR_MAINTENANCE',
      title: '❌ Atlas Cluster Paused or Inactive',
      action: 'Log in to MongoDB Atlas Console and verify your cluster is running and active.'
    };
  }

  if (name === 'MongoParseError' || msg.includes('Invalid scheme') || msg.includes('Invalid connection string')) {
    return {
      category: 'INVALID_CONNECTION_STRING',
      title: '❌ Invalid Connection String Format',
      action: 'Verify MONGODB_URI starts with "mongodb+srv://" and is properly formatted.'
    };
  }

  return {
    category: 'UNKNOWN_CONNECTION_ERROR',
    title: '❌ Database Connection Failure',
    action: `Details: ${msg}`
  };
};

module.exports = {
  sanitizeUri,
  auditConnectionUri,
  runNetworkDiagnostics,
  categorizeMongoError
};
