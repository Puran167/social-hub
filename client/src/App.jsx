import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Music from './pages/Music';
import Photos from './pages/Photos';
import Stories from './pages/Stories';
import Reels from './pages/Reels';
import Videos from './pages/Videos';
import Chat from './pages/Chat';
import VideoCall from './pages/VideoCall';
import VoiceAssistant from './pages/VoiceAssistant';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import WatchPartyRoom from './pages/WatchPartyRoom';
import Feed from './pages/Feed';
import SplashScreen from './pages/SplashScreen';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-dark-bg"><LoadingSpinner size="lg" /></div>;
  if (!user) return <Navigate to="/splash" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-dark-bg"><LoadingSpinner size="lg" /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/splash" element={<SplashScreen />} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="feed" element={<Feed />} />
      <Route path="music" element={<Music />} />
      <Route path="photos" element={<Photos />} />
      <Route path="stories" element={<Stories />} />
      <Route path="reels" element={<Reels />} />
      <Route path="videos" element={<Videos />} />
      <Route path="chat" element={<Chat />} />
      <Route path="video-call" element={<VideoCall />} />
      <Route path="voice-assistant" element={<VoiceAssistant />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="settings" element={<Settings />} />
      <Route path="friends" element={<Friends />} />
      <Route path="watch-party" element={<WatchPartyRoom />} />
      <Route path="profile" element={<Profile />} />
      <Route path="profile/:id" element={<Profile />} />
    </Route>

    <Route path="*" element={<Navigate to="/splash" replace />} />
  </Routes>
);

const App = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <MusicProvider>
              <NotificationProvider>
                <AppRoutes />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    className: '!bg-white !text-gray-800 dark:!bg-dark-card dark:!text-gray-100 !shadow-lg !border !border-gray-100 dark:!border-dark-border !rounded-2xl !text-sm !font-medium',
                    duration: 3000,
                    success: { iconTheme: { primary: '#6C5CE7', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#FF6B6B', secondary: '#fff' } },
                  }}
                />
              </NotificationProvider>
            </MusicProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
