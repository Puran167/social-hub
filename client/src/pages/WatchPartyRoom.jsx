import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlay, HiPause, HiForward, HiMusicalNote, HiFilm, HiUserGroup,
  HiPaperAirplane, HiClipboard, HiPlus, HiXMark, HiArrowLeft,
  HiLink, HiQueueList, HiSpeakerWave, HiClock, HiUserPlus,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { getSocket } from '../services/socket';
import API from '../services/api';
import toast from 'react-hot-toast';

const WatchPartyRoom = () => {
  const { user } = useAuth();
  const { playSong } = useMusic();
  const [parties, setParties] = useState([]);
  const [activeParty, setActiveParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [friends, setFriends] = useState([]);
  const [mediaTab, setMediaTab] = useState('songs');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const seekingRef = useRef(false);
  const syncLockRef = useRef(false);

  const isHost = activeParty?.host?._id === user?._id;

  useEffect(() => {
    fetchParties();
    fetchMedia();
    fetchFriends();
  }, []);

  const fetchParties = async () => {
    try {
      const { data } = await API.get('/parties');
      setParties(data);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const fetchMedia = async () => {
    try {
      const [songRes, videoRes] = await Promise.all([
        API.get('/songs?limit=50'),
        API.get('/videos?limit=50'),
      ]);
      setSongs(songRes.data.songs || []);
      setVideos(videoRes.data.videos || []);
    } catch (err) { /* ignore */ }
  };

  const fetchFriends = async () => {
    try {
      const { data } = await API.get('/friends');
      setFriends(data);
    } catch (err) { /* ignore */ }
  };

  // Socket listeners for the active party
  useEffect(() => {
    if (!activeParty) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join-party', activeParty._id);

    const onPlaybackSync = ({ isPlaying: ip, currentTime: ct }) => {
      syncLockRef.current = true;
      setIsPlaying(ip);
      const el = activeParty.currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
      if (el && Math.abs(el.currentTime - ct) > 2) el.currentTime = ct;
      if (ip) el?.play().catch(() => {});
      else el?.pause();
      setTimeout(() => { syncLockRef.current = false; }, 500);
    };

    const onSeekSync = ({ currentTime: ct }) => {
      syncLockRef.current = true;
      const el = activeParty.currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
      if (el) el.currentTime = ct;
      setTimeout(() => { syncLockRef.current = false; }, 500);
    };

    const onMediaChanged = ({ currentMedia, playbackState }) => {
      setActiveParty(prev => ({ ...prev, currentMedia, playbackState }));
      setIsPlaying(playbackState.isPlaying);
      setCurrentTime(0);
    };

    const onQueueUpdated = (queue) => {
      setActiveParty(prev => ({ ...prev, queue }));
    };

    const onChatMessage = (msg) => {
      setChatMessages(prev => [...prev, msg]);
    };

    const onUserJoined = ({ userId, name, profilePhoto }) => {
      toast.success(`${name} joined the party!`);
      setActiveParty(prev => ({
        ...prev,
        participants: [...(prev.participants || []), { _id: userId, name, profilePhoto }],
      }));
    };

    const onUserLeft = ({ userId, name }) => {
      toast(`${name} left the party`);
      setActiveParty(prev => ({
        ...prev,
        participants: prev.participants?.filter(p => p._id !== userId) || [],
      }));
    };

    const onTrackSkipped = () => {
      // Play next in queue
      if (activeParty.queue?.length > 0) {
        const next = activeParty.queue[0];
        setActiveParty(prev => ({
          ...prev,
          currentMedia: next,
          queue: prev.queue.slice(1),
        }));
        setCurrentTime(0);
        setIsPlaying(true);
      }
    };

    const onPartyEnded = () => {
      toast('Party has ended');
      setActiveParty(null);
      fetchParties();
    };

    socket.on('party-playback-sync', onPlaybackSync);
    socket.on('party-seek-sync', onSeekSync);
    socket.on('party-media-changed', onMediaChanged);
    socket.on('party-queue-updated', onQueueUpdated);
    socket.on('party-chat-message', onChatMessage);
    socket.on('party-user-joined', onUserJoined);
    socket.on('party-user-left', onUserLeft);
    socket.on('party-track-skipped', onTrackSkipped);
    socket.on('party-ended', onPartyEnded);

    return () => {
      socket.emit('leave-party', activeParty._id);
      socket.off('party-playback-sync', onPlaybackSync);
      socket.off('party-seek-sync', onSeekSync);
      socket.off('party-media-changed', onMediaChanged);
      socket.off('party-queue-updated', onQueueUpdated);
      socket.off('party-chat-message', onChatMessage);
      socket.off('party-user-joined', onUserJoined);
      socket.off('party-user-left', onUserLeft);
      socket.off('party-track-skipped', onTrackSkipped);
      socket.off('party-ended', onPartyEnded);
    };
  }, [activeParty?._id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Time update for progress bar
  const handleTimeUpdate = () => {
    const el = activeParty?.currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (el) {
      setCurrentTime(el.currentTime);
      setDuration(el.duration || activeParty?.currentMedia?.duration || 0);
    }
  };

  const handlePlayPause = () => {
    if (!isHost) return;
    const next = !isPlaying;
    setIsPlaying(next);
    const el = activeParty?.currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (next) el?.play().catch(() => {});
    else el?.pause();
    getSocket()?.emit('party-playback', {
      partyId: activeParty._id,
      isPlaying: next,
      currentTime: el?.currentTime || 0,
    });
  };

  const handleSeek = (e) => {
    if (!isHost) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    const el = activeParty?.currentMedia?.type === 'video' ? videoRef.current : audioRef.current;
    if (el) el.currentTime = newTime;
    setCurrentTime(newTime);
    getSocket()?.emit('party-seek', { partyId: activeParty._id, currentTime: newTime });
  };

  const handleSkip = () => {
    if (!isHost) return;
    getSocket()?.emit('party-skip', { partyId: activeParty._id });
    if (activeParty.queue?.length > 0) {
      const next = activeParty.queue[0];
      handleChangeMedia(next);
    }
  };

  const handleChangeMedia = async (media) => {
    if (!isHost) return;
    try {
      await API.put(`/parties/${activeParty._id}/media`, {
        mediaType: media.type || 'song',
        mediaId: media.mediaId || media._id,
        title: media.title,
        artist: media.artist || '',
        url: media.url || media.audioUrl || media.videoUrl,
        coverArt: media.coverArt || media.thumbnailUrl || '',
        duration: media.duration || 0,
      });
    } catch (err) { toast.error('Failed to change media'); }
  };

  const handleAddToQueue = async (item, type) => {
    try {
      await API.post(`/parties/${activeParty._id}/queue`, {
        mediaType: type,
        mediaId: item._id,
        title: item.title,
        artist: item.artist || '',
        url: type === 'song' ? item.audioUrl : item.videoUrl,
        coverArt: item.coverArt || item.thumbnailUrl || '',
        duration: item.duration || 0,
      });
      toast.success('Added to queue');
    } catch (err) { toast.error('Failed'); }
  };

  const handleCreateParty = async () => {
    if (!partyName.trim()) return toast.error('Enter a party name');
    try {
      const { data } = await API.post('/parties', { name: partyName });
      setActiveParty(data);
      setShowCreate(false);
      setPartyName('');
      toast.success('Party created!');
    } catch (err) { toast.error('Failed to create party'); }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data } = await API.post(`/parties/join/${joinCode.trim()}`);
      setActiveParty(data);
      setShowJoin(false);
      setJoinCode('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to join'); }
  };

  const handleJoinParty = async (party) => {
    try {
      const { data } = await API.get(`/parties/${party._id}`);
      setActiveParty(data);
      setChatMessages(data.chat || []);
    } catch (err) { toast.error('Failed to load party'); }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    getSocket()?.emit('party-chat', { partyId: activeParty._id, message: chatMsg.trim() });
    setChatMsg('');
  };

  const handleEndParty = async () => {
    try {
      await API.put(`/parties/${activeParty._id}/end`);
      setActiveParty(null);
      fetchParties();
    } catch (err) { toast.error('Failed'); }
  };

  const handleLeaveParty = async () => {
    try {
      await API.put(`/parties/${activeParty._id}/leave`);
      setActiveParty(null);
      fetchParties();
    } catch (err) { toast.error('Failed'); }
  };

  const copyInviteCode = () => {
    if (activeParty?.inviteCode) {
      navigator.clipboard.writeText(activeParty.inviteCode);
      toast.success('Invite code copied!');
    }
  };

  const inviteFriend = (friendId) => {
    getSocket()?.emit('party-chat', {
      partyId: activeParty._id,
      message: `Invited a friend to join! Code: ${activeParty.inviteCode}`,
    });
    // Also send them a notification via the personal room
    getSocket()?.emit('call-user', {
      to: friendId, offer: null, callType: 'party-invite',
      roomId: activeParty.inviteCode,
    });
    toast.success('Invite sent!');
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ---- LOBBY VIEW ----
  if (!activeParty) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-orange via-accent-coral to-accent-pink opacity-90" />
          <div className="relative p-6">
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <HiMusicalNote className="w-7 h-7" /> Watch Party
            </h1>
            <p className="text-white/70 text-sm mt-1">Listen & watch together with friends in real-time</p>
            <div className="flex gap-2 mt-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl text-sm font-semibold transition-colors">
                <HiPlus className="w-4 h-4" /> Create Party
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowJoin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl text-sm font-semibold transition-colors">
                <HiLink className="w-4 h-4" /> Join with Code
              </motion.button>
            </div>
          </div>
        </div>

        {/* Active Parties */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Your Parties</h2>
          {parties.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <HiUserGroup className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">No active parties. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {parties.map(p => (
                <motion.div key={p._id} whileHover={{ y: -2 }}
                  onClick={() => handleJoinParty(p)}
                  className="glass-card p-4 cursor-pointer hover:border-primary/30 dark:hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-orange/20 to-accent-pink/20 flex items-center justify-center flex-shrink-0">
                      {p.currentMedia?.type === 'video' ? <HiFilm className="w-6 h-6 text-accent-pink" /> : <HiMusicalNote className="w-6 h-6 text-accent-orange" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate group-hover:text-primary dark:group-hover:text-primary-dark transition-colors">{p.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Hosted by {p.host?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-primary/10 text-primary dark:text-primary-dark px-2 py-0.5 rounded-full font-medium">
                          {p.participants?.length || 0} listening
                        </span>
                        {p.currentMedia?.title && (
                          <span className="text-[10px] text-gray-400 truncate">
                            {p.currentMedia.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create Party Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreate(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold">Create a Party</h3>
                <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)}
                  placeholder="Party name..." className="input-field w-full" autoFocus />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                  <button onClick={handleCreateParty} className="btn-primary px-6">Create</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join by Code Modal */}
        <AnimatePresence>
          {showJoin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowJoin(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold">Join with Invite Code</h3>
                <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)}
                  placeholder="Enter invite code..." className="input-field w-full" autoFocus />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                  <button onClick={handleJoinByCode} className="btn-primary px-6">Join</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ---- ACTIVE PARTY ROOM VIEW ----
  const media = activeParty.currentMedia;
  const mediaUrl = media?.url || '';
  const isVideo = media?.type === 'video';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={isHost ? handleEndParty : handleLeaveParty}
            className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 transition-colors">
            <HiArrowLeft className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-lg font-extrabold">{activeParty.name}</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Hosted by {activeParty.host?.name} · {activeParty.participants?.length} listening
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowInvite(true)}
            className="p-2 rounded-xl hover:bg-primary/10 text-primary dark:text-primary-dark" title="Invite">
            <HiUserPlus className="w-5 h-5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={copyInviteCode}
            className="p-2 rounded-xl hover:bg-primary/10 text-primary dark:text-primary-dark" title="Copy invite code">
            <HiClipboard className="w-5 h-5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-xl transition-colors ${showQueue ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500'}`}>
            <HiQueueList className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Media Player */}
          <div className="glass-card overflow-hidden">
            {isVideo && mediaUrl ? (
              <video ref={videoRef} src={mediaUrl} className="w-full aspect-video bg-black"
                onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} />
            ) : (
              <div className="p-6 flex items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {media?.coverArt ? (
                    <img src={media.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <HiMusicalNote className="w-10 h-10 text-primary/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold truncate">{media?.title || 'No track selected'}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">{media?.artist || 'Select a song to play'}</p>
                </div>
              </div>
            )}

            {/* Hidden audio element */}
            {!isVideo && mediaUrl && (
              <audio ref={audioRef} src={mediaUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} />
            )}

            {/* Progress & Controls */}
            <div className="px-6 pb-5 space-y-3">
              {/* Progress bar */}
              <div className="space-y-1">
                <div className={`h-1.5 bg-gray-200 dark:bg-dark-hover rounded-full overflow-hidden ${isHost ? 'cursor-pointer' : ''}`}
                  onClick={handleSeek}>
                  <div className="h-full bg-gradient-to-r from-primary to-accent-pink rounded-full transition-all"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {isHost ? (
                  <>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleSkip}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500">
                      <HiForward className="w-5 h-5 rotate-180" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handlePlayPause}
                      className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-glow-sm">
                      {isPlaying ? <HiPause className="w-6 h-6" /> : <HiPlay className="w-6 h-6 ml-0.5" />}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleSkip}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500">
                      <HiForward className="w-5 h-5" />
                    </motion.button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <HiSpeakerWave className="w-4 h-4" />
                    <span>{isPlaying ? 'Playing...' : 'Paused'} · Host controls playback</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media Library (Host only) */}
          {isHost && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setMediaTab('songs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mediaTab === 'songs' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                  <HiMusicalNote className="w-3.5 h-3.5" /> Songs
                </button>
                <button onClick={() => setMediaTab('videos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mediaTab === 'videos' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                  <HiFilm className="w-3.5 h-3.5" /> Videos
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                {(mediaTab === 'songs' ? songs : videos).map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/80 dark:hover:bg-dark-hover/50 group">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(item.coverArt || item.thumbnailUrl) ? (
                        <img src={item.coverArt || item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <HiMusicalNote className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{item.artist || ''}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleChangeMedia({ ...item, type: mediaTab === 'songs' ? 'song' : 'video', url: item.audioUrl || item.videoUrl })}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary" title="Play Now">
                        <HiPlay className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAddToQueue(item, mediaTab === 'songs' ? 'song' : 'video')}
                        className="p-1.5 rounded-lg hover:bg-accent-teal/10 text-accent-teal" title="Add to Queue">
                        <HiPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Participants + Chat (or Queue) */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
          {/* Participants */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Participants ({activeParty.participants?.length || 0})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
              {activeParty.participants?.map(p => (
                <div key={p._id} className="flex items-center gap-2">
                  <div className="relative">
                    {p.profilePhoto ? (
                      <img src={p.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                        {p.name?.[0]}
                      </div>
                    )}
                    {p._id === activeParty.host?._id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-orange rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">H</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Queue */}
          <AnimatePresence>
            {showQueue && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 overflow-hidden">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Queue ({activeParty.queue?.length || 0})
                </h3>
                {activeParty.queue?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                    {activeParty.queue.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 w-4 text-center">{i + 1}</span>
                        <span className="font-medium truncate flex-1">{q.title}</span>
                        <span className="text-gray-400">{q.artist}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Queue is empty</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat */}
          <div className="glass-card flex flex-col" style={{ height: '350px' }}>
            <div className="px-4 py-3 border-b border-gray-200/60 dark:border-dark-border/60">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Party Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
              {chatMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2">
                  {msg.senderPhoto ? (
                    <img src={msg.senderPhoto} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {msg.senderName?.[0]}
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-primary dark:text-primary-dark">{msg.senderName}</span>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="p-3 border-t border-gray-200/60 dark:border-dark-border/60 flex gap-2">
              <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                placeholder="Type a message..." className="input-field flex-1 text-xs !py-2" />
              <motion.button whileTap={{ scale: 0.9 }} type="submit"
                className="p-2 rounded-xl bg-primary hover:bg-primary-hover text-white">
                <HiPaperAirplane className="w-4 h-4" />
              </motion.button>
            </form>
          </div>
        </div>
      </div>

      {/* Invite Friends Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Invite Friends</h3>
                <button onClick={() => setShowInvite(false)}><HiXMark className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
                <span className="text-sm font-mono flex-1 truncate">{activeParty.inviteCode}</span>
                <button onClick={copyInviteCode} className="text-primary text-xs font-semibold">Copy</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map(f => (
                  <div key={f._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover/50">
                    {f.profilePhoto ? (
                      <img src={f.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">{f.name?.[0]}</div>
                    )}
                    <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                    <button onClick={() => inviteFriend(f._id)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg">
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WatchPartyRoom;
