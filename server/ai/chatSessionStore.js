/**
 * Ephemeral In-Memory Chat Session Store.
 * ZERO persistence to MongoDB, Redis, Pinecone, or disk.
 * Automatically cleans up expired sessions after TTL.
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout
const MAX_CONVERSATION_TURNS = 10; // Keep last 10 turns in memory

const sessions = new Map();

/**
 * Retrieves or initializes an in-memory session.
 */
const getOrCreateSession = (sessionId, userId, groupId, userName) => {
  const uid = userId.toString();
  const sid = sessionId || `ai_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let session = sessions.get(sid);

  if (session) {
    // Validate session ownership
    if (session.userId !== uid) {
      console.warn(`[Security Alert] User ${uid} attempted to access session ${sid} belonging to ${session.userId}`);
      return null;
    }
    session.lastActivityAt = Date.now();
    if (groupId) session.groupId = groupId.toString();
    if (userName) session.userName = userName;
  } else {
    session = {
      sessionId: sid,
      userId: uid,
      groupId: groupId ? groupId.toString() : null,
      userName: userName || 'User',
      messages: [], // Format for Gemini multi-turn history: { role: 'user'|'model', parts: [{ text }] }
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      abortController: null,
    };
    sessions.set(sid, session);
  }

  return session;
};

const getSession = (sessionId, userId) => {
  if (!sessionId || !userId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.userId !== userId.toString()) return null;
  session.lastActivityAt = Date.now();
  return session;
};

const addMessageToSession = (sessionId, role, text) => {
  const session = sessions.get(sessionId);
  if (!session || !text) return;

  session.messages.push({
    role: role === 'user' ? 'user' : 'model',
    parts: [{ text: text.trim() }],
  });

  // Keep memory bounded to last turns
  if (session.messages.length > MAX_CONVERSATION_TURNS * 2) {
    session.messages = session.messages.slice(-MAX_CONVERSATION_TURNS * 2);
  }

  session.lastActivityAt = Date.now();
};

const setSessionAbortController = (sessionId, controller) => {
  const session = sessions.get(sessionId);
  if (session) {
    session.abortController = controller;
  }
};

const abortSessionGeneration = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session && session.abortController) {
    session.abortController.abort();
    session.abortController = null;
    return true;
  }
  return false;
};

const deleteSession = (sessionId, userId) => {
  const session = sessions.get(sessionId);
  if (session && (!userId || session.userId === userId.toString())) {
    if (session.abortController) {
      session.abortController.abort();
    }
    sessions.delete(sessionId);
    return true;
  }
  return false;
};

// Periodic in-memory garbage collector to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of sessions.entries()) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      if (session.abortController) session.abortController.abort();
      sessions.delete(sid);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  getOrCreateSession,
  getSession,
  addMessageToSession,
  setSessionAbortController,
  abortSessionGeneration,
  deleteSession,
};
