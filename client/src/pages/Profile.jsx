import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { HiMusicalNote, HiPhoto, HiVideoCamera, HiUserPlus, HiChatBubbleLeft, HiArrowRightOnRectangle, HiPlay, HiUserMinus, HiCheck, HiClock, HiXMark, HiHeart, HiChatBubbleOvalLeft, HiChevronLeft, HiChevronRight, HiPaperAirplane } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import API from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const { id } = useParams();
  const { user: me, logout } = useAuth();
  const { playSong } = useMusic();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('songs');
  const [content, setContent] = useState({ songs: [], photos: [], videos: [] });
  const [friendStatus, setFriendStatus] = useState('none');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [commentText, setCommentText] = useState('');

  const isOwnProfile = !id || id === me?._id;

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const userId = id || me?._id;
      const { data } = await API.get(`/users/${userId}`);
      setProfile(data);
      // Fetch user content
      const [songs, photos, videos] = await Promise.all([
        API.get(`/songs?user=${userId}`).catch(() => ({ data: { songs: [] } })),
        API.get(`/photos?user=${userId}`).catch(() => ({ data: { photos: [] } })),
        API.get(`/videos?user=${userId}`).catch(() => ({ data: { videos: [] } })),
      ]);
      setContent({
        songs: songs.data.songs || [],
        photos: photos.data.photos || [],
        videos: videos.data.videos || [],
      });
    } catch (err) { toast.error('Profile not found'); }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile || isOwnProfile || !me) return;
    // Check if already friends
    const isFriend = profile.friends?.some(f => (f._id || f) === me._id || (f._id || f).toString() === me._id.toString());
    if (isFriend) { setFriendStatus('friends'); return; }
    // Check for pending request
    API.get('/friends/pending').then(({ data }) => {
      const sent = data.find(r => (r.to?._id || r.to) === profile._id || (r.to?._id || r.to)?.toString() === profile._id.toString());
      const received = data.find(r => (r.from?._id || r.from) === profile._id || (r.from?._id || r.from)?.toString() === profile._id.toString());
      if (sent) setFriendStatus('pending-sent');
      else if (received) setFriendStatus('pending-received');
      else setFriendStatus('none');
    }).catch(() => {});
  }, [profile, me, isOwnProfile]);

  const sendFriendRequest = async () => {
    try {
      await API.post('/friends/request', { toUserId: profile._id });
      toast.success('Friend request sent!');
      setFriendStatus('pending-sent');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const removeFriend = async () => {
    try {
      await API.delete(`/friends/${profile._id}`);
      toast.success('Friend removed');
      setFriendStatus('none');
      setProfile(prev => ({ ...prev, friends: prev.friends.filter(f => (f._id || f).toString() !== me._id.toString()) }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading profile..." />;
  if (!profile) return <div className="text-center py-16 text-gray-500 dark:text-gray-400">Profile not found</div>;

  const stats = [
    { label: 'Songs', value: content.songs.length },
    { label: 'Photos', value: content.photos.length },
    { label: 'Videos', value: content.videos.length },
    { label: 'Friends', value: profile.friends?.length || 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Profile Header with Gradient Banner */}
      <div className="rounded-2xl overflow-hidden">
        <div className="relative h-36 sm:h-44">
          <div className="absolute inset-0 nebula-gradient" />
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
        </div>
        <div className="glass-card -mt-16 relative mx-4 sm:mx-6 text-center pb-6 pt-0">
          <div className="flex justify-center -mt-12 mb-3">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-dark-card shadow-glow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 dark:from-primary/30 dark:to-accent-pink/30 flex items-center justify-center text-3xl font-bold text-primary dark:text-primary-dark border-4 border-white dark:border-dark-card">
                {profile.name?.[0]}
              </div>
            )}
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{profile.name}</h1>
          {profile.bio && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">{profile.bio}</p>}

          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-5">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="font-bold text-lg text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {!isOwnProfile && (
            <div className="flex items-center justify-center gap-3 mt-5">
              {friendStatus === 'friends' ? (
                <motion.button whileTap={{ scale: 0.95 }} onClick={removeFriend}
                  className="px-4 py-2.5 bg-accent-teal/10 dark:bg-accent-teal/15 text-accent-teal hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors group">
                  <HiCheck className="w-4 h-4 group-hover:hidden" />
                  <HiUserMinus className="w-4 h-4 hidden group-hover:block" />
                  <span className="group-hover:hidden">Friends</span>
                  <span className="hidden group-hover:inline">Unfriend</span>
                </motion.button>
              ) : friendStatus === 'pending-sent' ? (
                <motion.button whileTap={{ scale: 0.95 }} disabled
                  className="px-4 py-2.5 bg-gray-100/80 dark:bg-dark-hover/80 rounded-xl text-sm font-semibold flex items-center gap-2 text-gray-400 cursor-not-allowed">
                  <HiClock className="w-4 h-4" /> Request Sent
                </motion.button>
              ) : friendStatus === 'pending-received' ? (
                <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                  try {
                    const { data: pending } = await API.get('/friends/pending');
                    const req = pending.find(r => (r.from?._id || r.from)?.toString() === profile._id.toString());
                    if (req) { await API.put(`/friends/accept/${req._id}`); toast.success('Friend accepted!'); setFriendStatus('friends'); }
                  } catch (err) { toast.error('Failed to accept'); }
                }}
                  className="btn-primary text-sm flex items-center gap-2">
                  <HiCheck className="w-4 h-4" /> Accept Request
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={sendFriendRequest}
                  className="btn-primary text-sm flex items-center gap-2">
                  <HiUserPlus className="w-4 h-4" /> Add Friend
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/chat')}
                className="px-4 py-2.5 bg-gray-100/80 dark:bg-dark-hover/80 hover:bg-gray-200 dark:hover:bg-dark-elevated rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
                <HiChatBubbleLeft className="w-4 h-4" /> Message
              </motion.button>
            </div>
          )}

          {isOwnProfile && (
            <div className="flex items-center justify-center mt-5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { logout(); navigate('/login'); }}
                className="px-5 py-2.5 bg-accent-coral/10 dark:bg-accent-coral/10 text-accent-coral hover:bg-accent-coral/20 dark:hover:bg-accent-coral/20 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <HiArrowRightOnRectangle className="w-4 h-4" /> Log Out
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/60 dark:bg-dark-card/60 backdrop-blur-lg rounded-xl p-1">
        {[
          { id: 'songs', label: 'Songs', icon: HiMusicalNote },
          { id: 'photos', label: 'Photos', icon: HiPhoto },
          { id: 'videos', label: 'Videos', icon: HiVideoCamera },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-dark-surface text-primary dark:text-primary-dark shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <AnimatePresence mode="wait">
        {activeTab === 'songs' && (
          <motion.div key="songs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
            {content.songs.map(song => (
              <motion.button
                key={song._id}
                whileTap={{ scale: 0.98 }}
                onClick={() => playSong(song, content.songs)}
                className="glass-card p-3 flex items-center gap-3 w-full text-left group hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/20 dark:to-accent-pink/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {song.coverArt ? (
                    <img src={song.coverArt} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <HiMusicalNote className="w-5 h-5 text-primary dark:text-primary-dark" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{song.title}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{song.artist}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiPlay className="w-4 h-4 text-primary dark:text-primary-dark ml-0.5" />
                </div>
              </motion.button>
            ))}
            {content.songs.length === 0 && <p className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No songs yet</p>}
          </motion.div>
        )}

        {activeTab === 'photos' && (
          <motion.div key="photos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-3 gap-1">
            {content.photos.map(photo => (
              <motion.button
                key={photo._id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-square rounded-sm overflow-hidden bg-gray-100 dark:bg-dark-card relative group cursor-pointer"
              >
                <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1 text-white font-semibold text-sm">
                    <HiHeart className="w-5 h-5 fill-white" /> {photo.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1 text-white font-semibold text-sm">
                    <HiChatBubbleOvalLeft className="w-5 h-5" /> {photo.comments?.length || 0}
                  </span>
                </div>
              </motion.button>
            ))}
            {content.photos.length === 0 && <p className="col-span-3 text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No photos yet</p>}
          </motion.div>
        )}

        {activeTab === 'videos' && (
          <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-3 gap-1">
            {content.videos.map(video => (
              <motion.button
                key={video._id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedVideo(video)}
                className="aspect-square rounded-sm overflow-hidden bg-black relative group cursor-pointer"
              >
                <video src={video.videoUrl} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <HiPlay className="w-8 h-8 text-white/80" />
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1 text-white font-semibold text-sm">
                    <HiHeart className="w-5 h-5 fill-white" /> {video.likes?.length || 0}
                  </span>
                </div>
              </motion.button>
            ))}
            {content.videos.length === 0 && <p className="col-span-3 text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No videos yet</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== INSTAGRAM-LIKE PHOTO DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-50"
              onClick={() => setSelectedPhoto(null)}>
              <HiXMark className="w-7 h-7" />
            </button>

            {/* Prev / Next arrows */}
            {content.photos.indexOf(selectedPhoto) > 0 && (
              <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-50"
                onClick={(e) => { e.stopPropagation(); const idx = content.photos.indexOf(selectedPhoto); setSelectedPhoto(content.photos[idx - 1]); setCommentText(''); }}>
                <HiChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            {content.photos.indexOf(selectedPhoto) < content.photos.length - 1 && (
              <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-50"
                onClick={(e) => { e.stopPropagation(); const idx = content.photos.indexOf(selectedPhoto); setSelectedPhoto(content.photos[idx + 1]); setCommentText(''); }}>
                <HiChevronRight className="w-5 h-5 text-white" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row max-w-5xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image - left side */}
              <div className="sm:w-[60%] bg-black flex items-center justify-center min-h-[300px] sm:min-h-[500px]">
                <img src={selectedPhoto.imageUrl} alt="" className="w-full h-full object-contain max-h-[90vh]" />
              </div>

              {/* Details - right side */}
              <div className="sm:w-[40%] flex flex-col max-h-[90vh] sm:max-h-none">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-dark-border">
                  {(selectedPhoto.uploadedBy || profile)?.profilePhoto ? (
                    <img src={(selectedPhoto.uploadedBy || profile).profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center text-sm font-bold text-primary">
                      {(selectedPhoto.uploadedBy || profile)?.name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{(selectedPhoto.uploadedBy || profile)?.name}</p>
                    {selectedPhoto.album && selectedPhoto.album !== 'General' && (
                      <p className="text-[11px] text-gray-400">{selectedPhoto.album}</p>
                    )}
                  </div>
                </div>

                {/* Caption & Comments */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedPhoto.caption && (
                    <div className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {(selectedPhoto.uploadedBy || profile)?.name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-900 dark:text-white mr-1.5">{(selectedPhoto.uploadedBy || profile)?.name}</span>
                          <span className="text-gray-700 dark:text-gray-300">{selectedPhoto.caption}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(selectedPhoto.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {selectedPhoto.comments?.map(c => (
                    <div key={c._id} className="flex gap-2.5">
                      {c.user?.profilePhoto ? (
                        <img src={c.user.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {c.user?.name?.[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-900 dark:text-white mr-1.5">{c.user?.name}</span>
                          <span className="text-gray-700 dark:text-gray-300">{c.text}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!selectedPhoto.comments || selectedPhoto.comments.length === 0) && !selectedPhoto.caption && (
                    <p className="text-center text-gray-400 text-sm py-8">No comments yet</p>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 dark:border-dark-border px-4 py-3">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await API.put(`/photos/like/${selectedPhoto._id}`);
                          setSelectedPhoto(data);
                          setContent(prev => ({ ...prev, photos: prev.photos.map(p => p._id === data._id ? data : p) }));
                        } catch (err) { /* ignore */ }
                      }}
                      className="group"
                    >
                      <HiHeart className={`w-6 h-6 transition-colors ${selectedPhoto.likes?.some(l => (l._id || l) === me?._id || (l.toString?.() === me?._id)) ? 'text-red-500 fill-red-500' : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500'}`} />
                    </button>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPhoto.likes?.length || 0} likes</span>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!commentText.trim()) return;
                      try {
                        const { data } = await API.post(`/photos/comment/${selectedPhoto._id}`, { text: commentText });
                        setSelectedPhoto(data);
                        setContent(prev => ({ ...prev, photos: prev.photos.map(p => p._id === data._id ? data : p) }));
                        setCommentText('');
                      } catch (err) { toast.error('Comment failed'); }
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800 dark:text-gray-100"
                    />
                    <button type="submit" disabled={!commentText.trim()}
                      className="text-primary dark:text-primary-dark font-semibold text-sm disabled:opacity-30">
                      <HiPaperAirplane className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== VIDEO DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-50"
              onClick={() => setSelectedVideo(null)}>
              <HiXMark className="w-7 h-7" />
            </button>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-4xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <video src={selectedVideo.videoUrl} controls autoPlay className="w-full max-h-[80vh] rounded-2xl object-contain bg-black" />
              <p className="text-white text-center font-semibold mt-3">{selectedVideo.title}</p>
              {selectedVideo.description && <p className="text-white/60 text-center text-sm mt-1">{selectedVideo.description}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
