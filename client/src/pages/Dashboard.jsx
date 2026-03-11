import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiMusicalNote, HiPhoto, HiChatBubbleLeftRight, HiUserGroup, HiSparkles, HiPlay, HiFilm, HiHeart, HiBookOpen, HiVideoCamera, HiNewspaper, HiSignal, HiPhone } from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { useNotifications } from '../context/NotificationContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const Dashboard = () => {
  const { user } = useAuth();
  const { playSong } = useMusic();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [recentSongs, setRecentSongs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [songsRes, friendsRes, pendingRes] = await Promise.all([
          API.get('/songs?limit=8'),
          API.get('/friends'),
          API.get('/friends/pending'),
        ]);
        setRecentSongs(songsRes.data.songs || []);
        setFriends(friendsRes.data || []);
        setPendingRequests(pendingRes.data || []);
      } catch (err) { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Loading your feed..." />;

  const quickLinks = [
    { label: 'Feed', icon: HiNewspaper, color: 'bg-gradient-to-br from-accent-rose to-primary', to: '/feed' },
    { label: 'Music', icon: HiMusicalNote, color: 'bg-gradient-to-br from-primary to-purple-600', to: '/music' },
    { label: 'Photos', icon: HiPhoto, color: 'bg-gradient-to-br from-accent-pink to-accent-coral', to: '/photos' },
    { label: 'Stories', icon: HiBookOpen, color: 'bg-gradient-to-br from-yellow-400 to-orange-500', to: '/stories' },
    { label: 'Reels', icon: HiFilm, color: 'bg-gradient-to-br from-accent-rose to-accent-coral', to: '/reels' },
    { label: 'Videos', icon: HiVideoCamera, color: 'bg-gradient-to-br from-red-500 to-rose-600', to: '/videos' },
    { label: 'Chat', icon: HiChatBubbleLeftRight, color: 'bg-gradient-to-br from-accent-blue to-accent-teal', to: '/chat' },
    { label: 'Calls', icon: HiPhone, color: 'bg-gradient-to-br from-green-500 to-emerald-600', to: '/video-call' },
    { label: 'Friends', icon: HiUserGroup, color: 'bg-gradient-to-br from-accent-teal to-accent-mint', to: '/friends' },
    { label: 'Watch Party', icon: HiSignal, color: 'bg-gradient-to-br from-indigo-500 to-violet-600', to: '/watch-party' },
  ];

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Hero */}
      <motion.div variants={item} className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 nebula-gradient opacity-90" />
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
        <div className="relative p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm p-[2px] shadow-lg cursor-pointer" onClick={() => navigate(`/profile/${user?._id}`)}>
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-dark-card overflow-hidden">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-500 dark:text-gray-400">
                  {user?.name?.[0]}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-white">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-white/70">Here's what's happening today</p>
            <div className="flex gap-2 mt-2">
              <span onClick={() => navigate('/friends')} className="text-[11px] bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-medium cursor-pointer hover:bg-white/30 transition-colors">
                {friends.length} Friends
              </span>
              <span onClick={() => navigate('/friends')} className="text-[11px] bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-medium cursor-pointer hover:bg-white/30 transition-colors">
                {pendingRequests.length} New
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stories / Friends Row */}
      {friends.length > 0 && (
        <motion.div variants={item}>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Your Story */}
            <button onClick={() => navigate('/stories')} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-hover border-2 border-dashed border-gray-300 dark:border-dark-border flex items-center justify-center">
                <HiBookOpen className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Your Story</span>
            </button>
            {friends.slice(0, 10).map(friend => (
              <button key={friend._id} onClick={() => navigate(`/profile/${friend._id}`)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="story-ring">
                  <div className="w-[60px] h-[60px] rounded-full bg-white dark:bg-dark-card overflow-hidden">
                    {friend.profilePhoto ? (
                      <img src={friend.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                        {friend.name?.[0]}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate w-16 text-center">
                  {friend.name?.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Links */}
      <motion.div variants={item} className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {quickLinks.map(({ label, icon: Icon, color, to }) => (
          <motion.button
            key={label}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(to)}
            className={`${color} rounded-2xl p-4 text-white text-left shadow-md hover:shadow-lg transition-shadow relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <Icon className="w-6 h-6 mb-2 opacity-90 relative z-10" />
            <p className="text-xs font-semibold relative z-10">{label}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Recent Songs */}
      {recentSongs.length > 0 && (
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Songs</h2>
            <button onClick={() => navigate('/music')} className="text-sm text-primary dark:text-primary-dark font-semibold hover:opacity-80">
              See All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentSongs.slice(0, 6).map(song => (
              <motion.button
                key={song._id}
                whileTap={{ scale: 0.98 }}
                whileHover={{ x: 2 }}
                onClick={() => playSong(song, recentSongs)}
                className="glass-card p-3 flex items-center gap-3 text-left group hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/20 dark:to-accent-pink/20 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                  {song.coverArt ? (
                    <img src={song.coverArt} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <HiMusicalNote className="w-5 h-5 text-primary dark:text-primary-dark" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{song.title}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{song.artist}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiPlay className="w-4 h-4 text-primary dark:text-primary-dark ml-0.5" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <HiSparkles className="w-5 h-5 text-accent-pink" /> For You
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {recommendations.slice(0, 5).map(song => (
              <motion.button
                key={song._id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => playSong(song, recommendations)}
                className="glass-card p-3 text-left group"
              >
                <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/20 dark:to-accent-pink/20 mb-3 flex items-center justify-center overflow-hidden relative">
                  {song.coverArt ? (
                    <img src={song.coverArt} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <HiMusicalNote className="w-8 h-8 text-primary/60" />
                  )}
                  <div className="absolute bottom-2 right-2 w-9 h-9 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg">
                    <HiPlay className="w-4 h-4 text-white ml-0.5" />
                  </div>
                </div>
                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{song.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{song.artist}</p>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Recent Activity */}
      {notifications.length > 0 && (
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Activity</h2>
            <button onClick={() => navigate('/notifications')} className="text-sm text-primary dark:text-primary-dark font-semibold hover:opacity-80">
              View All
            </button>
          </div>
          <div className="glass-card divide-y divide-gray-100/60 dark:divide-dark-border/30 overflow-hidden">
            {notifications.slice(0, 4).map(n => (
              <div key={n._id} className={`p-3.5 flex items-center gap-3 transition-colors ${!n.isRead ? 'bg-primary/5 dark:bg-primary/8' : 'hover:bg-gray-50/50 dark:hover:bg-dark-hover/30'}`}>
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {n.sender?.profilePhoto ? (
                    <img src={n.sender.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{n.sender?.name?.[0] || '?'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-gray-900 dark:text-white">{n.content}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};

export default Dashboard;
