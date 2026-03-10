const User = require('../models/User');
const jwt = require('jsonwebtoken');

const onlineUsers = new Map();

const setupSocket = (io) => {
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.name}`);

    // Track online status
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });
    socket.join(userId); // Join personal room for notifications
    io.emit('user-online', { userId, isOnline: true });

    // ---- CHAT ----
    socket.on('join-chat', (conversationId) => {
      socket.join(`chat-${conversationId}`);
    });

    socket.on('leave-chat', (conversationId) => {
      socket.leave(`chat-${conversationId}`);
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`chat-${conversationId}`).emit('user-typing', {
        userId, name: socket.user.name, isTyping,
      });
    });

    socket.on('message-seen', ({ conversationId, messageId }) => {
      socket.to(`chat-${conversationId}`).emit('message-seen', { userId, messageId });
    });

    // ---- VOICE / VIDEO CALLS (WebRTC Signaling) ----
    socket.on('call-user', ({ to, offer, callType, roomId }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('incoming-call', {
          from: userId,
          fromName: socket.user.name,
          fromPhoto: socket.user.profilePhoto,
          offer,
          callType,
          roomId,
        });
      }
    });

    socket.on('call-answer', ({ to, answer }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('call-answered', { from: userId, answer });
      }
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('ice-candidate', { from: userId, candidate });
      }
    });

    socket.on('end-call', ({ to }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('call-ended', { from: userId });
      }
    });

    socket.on('reject-call', ({ to }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('call-rejected', { from: userId });
      }
    });

    // Group call
    socket.on('join-room', (roomId) => {
      socket.join(`room-${roomId}`);
      socket.to(`room-${roomId}`).emit('user-joined-room', {
        userId, name: socket.user.name, profilePhoto: socket.user.profilePhoto,
      });
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(`room-${roomId}`);
      socket.to(`room-${roomId}`).emit('user-left-room', { userId });
    });

    socket.on('room-offer', ({ roomId, to, offer }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('room-offer', { from: userId, offer });
      }
    });

    socket.on('room-answer', ({ roomId, to, answer }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('room-answer', { from: userId, answer });
      }
    });

    socket.on('room-ice-candidate', ({ roomId, to, candidate }) => {
      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit('room-ice-candidate', { from: userId, candidate });
      }
    });

    // ---- COLLABORATIVE PLAYLISTS ----
    socket.on('join-playlist', (playlistId) => {
      socket.join(`playlist-${playlistId}`);
    });

    socket.on('leave-playlist', (playlistId) => {
      socket.leave(`playlist-${playlistId}`);
    });

    // ---- WATCH PARTY ----
    socket.on('join-party', (partyId) => {
      socket.join(`party-${partyId}`);
      socket.to(`party-${partyId}`).emit('party-user-joined', {
        userId, name: socket.user.name, profilePhoto: socket.user.profilePhoto,
      });
    });

    socket.on('leave-party', (partyId) => {
      socket.leave(`party-${partyId}`);
      socket.to(`party-${partyId}`).emit('party-user-left', {
        userId, name: socket.user.name,
      });
    });

    socket.on('party-playback', ({ partyId, isPlaying, currentTime }) => {
      socket.to(`party-${partyId}`).emit('party-playback-sync', {
        isPlaying, currentTime, updatedBy: userId,
      });
    });

    socket.on('party-seek', ({ partyId, currentTime }) => {
      socket.to(`party-${partyId}`).emit('party-seek-sync', {
        currentTime, updatedBy: userId,
      });
    });

    socket.on('party-chat', ({ partyId, message }) => {
      io.to(`party-${partyId}`).emit('party-chat-message', {
        sender: userId,
        senderName: socket.user.name,
        senderPhoto: socket.user.profilePhoto,
        message,
        createdAt: new Date(),
      });
    });

    socket.on('party-skip', ({ partyId }) => {
      io.to(`party-${partyId}`).emit('party-track-skipped', { updatedBy: userId });
    });

    // ---- GROUP CHAT TYPING ----
    socket.on('group-typing', ({ conversationId, isTyping }) => {
      socket.to(`chat-${conversationId}`).emit('group-user-typing', {
        userId, name: socket.user.name, isTyping,
      });
    });

    // ---- DISCONNECT ----
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name}`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date(), socketId: '' });
      io.emit('user-online', { userId, isOnline: false });
    });
  });
};

module.exports = setupSocket;
