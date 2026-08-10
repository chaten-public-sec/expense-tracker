const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupMember = require('../models/GroupMember');

// In-memory maps for socket management
const userSockets = new Map(); // userId → Set<socketId>

let io = null;

/**
 * Initialize Socket.IO on the HTTP server
 */
const init = (httpServer, corsOptions) => {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      console.error('[Socket Auth Error]:', err.message);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket.IO] User connected: ${socket.user.fullName} (${userId}) — socket: ${socket.id}`);

    // Track user's sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Auto-join user's group room
    try {
      const membership = await GroupMember.findOne({ userId });
      if (membership) {
        const roomName = `group:${membership.groupId.toString()}`;
        socket.join(roomName);
        socket.groupRoom = roomName;
        console.log(`[Socket.IO] ${socket.user.fullName} joined room: ${roomName}`);
      }
    } catch (err) {
      console.error('[Socket.IO] Error joining group room:', err.message);
    }

    // Register AI Assistant Chat Socket Handlers
    const { registerAIChatHandlers } = require('./aiChatSocketHandler');
    registerAIChatHandlers(socket);

    // Handle manual room join (e.g. after creating/joining group)
    socket.on('join-group', (groupId) => {
      if (groupId) {
        const roomName = `group:${groupId}`;
        socket.join(roomName);
        socket.groupRoom = roomName;
        console.log(`[Socket.IO] ${socket.user.fullName} manually joined room: ${roomName}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${socket.user.fullName} — reason: ${reason}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  console.log('[Socket.IO] Initialized and listening for connections');
  return io;
};

/**
 * Get the io instance
 */
const getIO = () => {
  if (!io) {
    console.warn('[Socket.IO] Not initialized yet — getIO() called before init()');
  }
  return io;
};

/**
 * Emit to a specific user's all connected sockets
 */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  const targetId = userId.toString();
  const sockets = userSockets.get(targetId);
  if (sockets && sockets.size > 0) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
};

/**
 * Emit to all members of a group room, optionally excluding a user
 */
const emitToGroup = (groupId, event, data, excludeUserId = null) => {
  if (!io) return;
  const roomName = `group:${groupId.toString()}`;

  if (excludeUserId) {
    const excludeId = excludeUserId.toString();
    const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId !== excludeId) {
          socket.emit(event, data);
        }
      }
    }
  } else {
    io.to(roomName).emit(event, data);
  }
};

/**
 * Emit to a specific list of user IDs, optionally excluding one
 */
const emitToUsers = (userIds, event, data, excludeUserId = null) => {
  if (!io) return;
  const excludeId = excludeUserId ? excludeUserId.toString() : null;

  for (const uid of userIds) {
    const id = uid.toString();
    if (id === excludeId) continue;
    emitToUser(id, event, data);
  }
};

module.exports = {
  init,
  getIO,
  emitToUser,
  emitToGroup,
  emitToUsers,
};
