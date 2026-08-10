const { processAIStreamQuery } = require('../ai/aiOrchestrator');
const {
  getOrCreateSession,
  abortSessionGeneration,
  deleteSession,
} = require('../ai/chatSessionStore');

/**
 * Registers AI assistant event listeners for an authenticated socket.
 */
const registerAIChatHandlers = (socket) => {
  const user = socket.user;
  const userId = socket.userId;

  // Rate limiting map per user in memory: timestamps array
  const userQueryTimestamps = [];
  const MAX_QUERIES_PER_MINUTE = 20;

  // 1. Session start / resume
  socket.on('ai:chat:start', (data = {}) => {
    try {
      const requestedSessionId = data.sessionId || null;
      const session = getOrCreateSession(requestedSessionId, userId, null, user.fullName);

      if (!session) {
        return socket.emit('ai:chat:error', { message: 'Failed to start AI session.' });
      }

      socket.emit('ai:chat:ready', {
        sessionId: session.sessionId,
      });
    } catch (err) {
      console.error('[Socket AI Start Error]:', err.message);
      socket.emit('ai:chat:error', { message: 'Could not initialize AI chat session.' });
    }
  });

  // 2. Incoming chat message
  socket.on('ai:chat:message', async (data = {}) => {
    const requestId = data.requestId || `ai_req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    try {
      const { sessionId, text } = data;

      if (!text || !text.trim()) {
        return socket.emit('ai:chat:error', { requestId, message: 'Message text cannot be empty.' });
      }

      // Check Super Admin exclusion
      if (user.isSuperAdmin || user.email === 'admin@gmail.com') {
        return socket.emit('ai:chat:error', {
          requestId,
          message: 'Super Admin accounts manage the platform globally and do not have personal group expense balances.',
        });
      }

      // Sliding window rate limit check
      const now = Date.now();
      while (userQueryTimestamps.length > 0 && now - userQueryTimestamps[0] > 60000) {
        userQueryTimestamps.shift();
      }

      if (userQueryTimestamps.length >= MAX_QUERIES_PER_MINUTE) {
        return socket.emit('ai:chat:error', {
          requestId,
          message: 'Rate limit exceeded. Please wait a moment before sending another query.',
        });
      }

      userQueryTimestamps.push(now);

      // Notify frontend that AI started thinking
      socket.emit('ai:chat:thinking', { requestId });

      await processAIStreamQuery({
        sessionId,
        requestId,
        user,
        userPrompt: text.trim(),
        onToolStart: (toolName, friendlyLabel) => {
          socket.emit('ai:chat:tool:start', { requestId, toolName, friendlyLabel });
        },
        onToolComplete: (toolName) => {
          socket.emit('ai:chat:tool:complete', { requestId, toolName });
        },
        onToken: (token) => {
          socket.emit('ai:chat:token', { requestId, token });
        },
        onComplete: ({ fullText }) => {
          socket.emit('ai:chat:message:complete', { requestId, fullText });
        },
        onError: (errMsg) => {
          if (errMsg && errMsg.includes('timed out')) {
            socket.emit('ai:chat:timeout', { requestId, message: 'AI response timed out. Please try again.' });
          } else {
            socket.emit('ai:chat:error', { requestId, message: errMsg || 'An error occurred while generating response.' });
          }
        },
      });
    } catch (err) {
      console.error('[Socket AI Message Error]:', err);
      socket.emit('ai:chat:error', { requestId, message: 'An error occurred while generating response.' });
    }
  });

  // 3. Stop active generation
  socket.on('ai:chat:stop', (data = {}) => {
    const { sessionId } = data;
    if (sessionId) {
      const aborted = abortSessionGeneration(sessionId);
      if (aborted) {
        socket.emit('ai:chat:stopped');
      }
    }
  });

  // 4. Reset / New Chat
  socket.on('ai:chat:reset', (data = {}) => {
    const { sessionId } = data;
    if (sessionId) {
      deleteSession(sessionId, userId);
    }
    const newSession = getOrCreateSession(null, userId, null, user.fullName);
    socket.emit('ai:chat:ready', {
      sessionId: newSession.sessionId,
    });
  });
};

module.exports = {
  registerAIChatHandlers,
};
