const https = require('https');
const http = require('http');

/**
 * Auto self-ping keep-alive module to prevent Render free instances from sleeping.
 * Pings /ping endpoint every 14 minutes (840,000 ms).
 */
const startKeepAlive = () => {
  // Render automatically provides RENDER_EXTERNAL_URL on deployed instances
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || process.env.BACKEND_URL;

  if (!targetUrl) {
    console.log('[KeepAlive] No external RENDER_EXTERNAL_URL or SERVER_URL set. Local development mode — self-ping inactive.');
    return;
  }

  const pingUrl = targetUrl.replace(/\/+$/, '') + '/ping';
  const FOURTEEN_MINUTES = 14 * 60 * 1000;

  console.log(`⏱️ [KeepAlive] Enabled! Will self-ping every 14 minutes at: ${pingUrl}`);

  const doPing = () => {
    try {
      const client = pingUrl.startsWith('https') ? https : http;
      const req = client.get(pingUrl, (res) => {
        if (res.statusCode === 200) {
          console.log(`[KeepAlive ${new Date().toLocaleTimeString('en-IN')}] Self-ping successful: 200 OK (${pingUrl})`);
        } else {
          console.warn(`[KeepAlive ${new Date().toLocaleTimeString('en-IN')}] Self-ping status: ${res.statusCode}`);
        }
      });

      req.on('error', (err) => {
        console.error('[KeepAlive Error]:', err.message);
      });

      req.end();
    } catch (err) {
      console.error('[KeepAlive Exception]:', err.message);
    }
  };

  // Initial ping after 30 seconds of startup
  setTimeout(doPing, 30000);

  // Recurring ping every 14 minutes
  const timer = setInterval(doPing, FOURTEEN_MINUTES);

  // Prevent keeping Node process open during shutdown
  if (timer.unref) {
    timer.unref();
  }
};

module.exports = { startKeepAlive };
