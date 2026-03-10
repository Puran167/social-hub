# Personal Social Hub

A full-stack web application combining **Spotify** (music), **Instagram** (photos/stories/reels), **WhatsApp** (real-time chat), and **Zoom** (video calls) into one unified platform.

## Features

- **Music Library** – Upload, organize, stream songs with a Spotify-style player; shuffle, repeat, queue management
- **AI Music Generation** – Generate music tracks using AI prompts, save to library
- **Photo Gallery** – Instagram-style grid, photo detail with comments, slideshow mode
- **Stories** – 24h expiring stories with progress bars, highlights
- **Reels** – Vertical scroll video feed with auto-play, like/comment
- **Video Library** – Upload and browse videos, comments, view tracking
- **Real-time Chat** – WhatsApp-style messaging with emoji, image/file sharing, voice messages, typing indicators, online status
- **Video Calls** – Zoom-style WebRTC video/voice calls with screen sharing, in-call chat
- **Voice Assistant** – Speech recognition to control the app with voice commands
- **Playlists** – Standard and collaborative playlists with invite system
- **Friend System** – Search users, send/accept/reject friend requests
- **Notifications** – Real-time notifications for likes, comments, friend requests, messages
- **User Profiles** – Customizable profiles with avatar, bio, privacy settings
- **Dark Mode** – Default dark theme with light mode toggle

## Tech Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **Socket.io** (real-time communication)
- **WebRTC** signaling server
- **Cloudinary** (media storage)
- **JWT** authentication
- **bcrypt.js** password hashing
- **express-validator** input validation
- **helmet** + **express-rate-limit** security

### Frontend
- **React 18** with React Router v6
- **Tailwind CSS** with custom dark theme
- **Socket.io Client**
- **Axios** HTTP client
- **Framer Motion** animations
- **WaveSurfer.js** audio visualizations
- **Emoji Picker React**
- **React Dropzone** file uploads
- **React Hot Toast** notifications
- **React Icons**

## Project Structure

```
personal-social-hub/
├── server/
│   ├── config/          # DB & Cloudinary config
│   ├── controllers/     # Route handlers (12 controllers)
│   ├── middleware/       # Auth & file upload middleware
│   ├── models/          # Mongoose models (11 models)
│   ├── routes/          # Express routes (12 route files)
│   ├── sockets/         # Socket.io event handlers
│   ├── server.js        # Entry point
│   └── package.json
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/  # Shared UI & layout components
│   │   ├── context/     # React Context providers (4)
│   │   ├── hooks/       # Custom hooks (WebRTC, Voice)
│   │   ├── pages/       # All application pages (16)
│   │   ├── services/    # API & Socket services
│   │   ├── App.jsx      # Main router
│   │   ├── index.js     # Entry point
│   │   └── index.css    # Global styles
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Cloudinary** account ([Sign up free](https://cloudinary.com))
- **OpenAI API key** (optional, for AI music generation)

## Setup & Installation

### 1. Clone the repository

```bash
cd personal-social-hub
```

### 2. Configure environment variables

Create `server/.env` from the example:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/personal-social-hub
JWT_SECRET=your-super-secret-jwt-key-change-this
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
OPENAI_API_KEY=your-openai-key  # Optional
CLIENT_URL=http://localhost:3000
```

### 3. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Run the application

**Terminal 1 – Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 – Frontend:**
```bash
cd client
npm start
```

The app will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## API Endpoints

| Resource | Routes |
|----------|--------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile` |
| Users | `GET /api/users/search`, `GET /api/users/:id` |
| Friends | `POST /api/friends/request/:id`, `PUT /api/friends/accept/:id`, `GET /api/friends` |
| Songs | `GET /api/songs`, `POST /api/songs`, `PUT /api/songs/like/:id` |
| Playlists | `GET /api/playlists`, `POST /api/playlists`, `PUT /api/playlists/:id/songs` |
| Photos | `GET /api/photos`, `POST /api/photos`, `PUT /api/photos/like/:id` |
| Videos | `GET /api/videos`, `POST /api/videos`, `PUT /api/videos/like/:id` |
| Stories | `GET /api/stories`, `POST /api/stories` |
| Reels | `GET /api/reels`, `POST /api/reels`, `PUT /api/reels/like/:id` |
| Chat | `GET /api/chat/conversations`, `POST /api/chat/messages/:conversationId` |
| Notifications | `GET /api/notifications`, `PUT /api/notifications/read-all` |
| AI | `POST /api/ai/generate`, `GET /api/ai/recommendations` |

## Socket Events

- `join-room` / `leave-room` – Chat rooms
- `send-message` / `receive-message` – Real-time messaging
- `typing` / `stop-typing` – Typing indicators
- `call-user` / `call-answer` / `ice-candidate` / `end-call` – WebRTC signaling
- `notification` – Push notifications

## License

MIT
