require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const { initFirebase } = require('./config/firebase');
const connectDB = require('./config/db');
const setupSocket = require('./sockets');

const app = express();
const server = http.createServer(app);

// Allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // In production, also allow same-domain requests
    if (process.env.NODE_ENV === 'production') return callback(null, true);
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
};

// Socket.io
const io = new Server(server, { cors: corsOptions });

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());

// Initialize Firebase Admin
initFirebase();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/parties', require('./routes/parties'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/pages', require('./routes/pages'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React client in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

// Socket setup
setupSocket(io);

// Connect DB and start server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
