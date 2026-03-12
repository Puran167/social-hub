import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlay, HiPause, HiForward, HiMusicalNote, HiFilm, HiUserGroup,
  HiPaperAirplane, HiClipboard, HiPlus, HiXMark, HiArrowLeft,
  HiLink, HiQueueList, HiSpeakerWave, HiClock, HiUserPlus, HiTrash,
  HiSignal, HiChatBubbleLeft,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import API from '../services/api';
import toast from 'react-hot-toast';

const WatchPartyRoom = () => {
  const { user } = useAuth();
  const [parties, setParties] = useState([]);
  const [activeParty, setActiveParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showChat, setShowChat] = useState(true);
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
        API.get('/songs?limit=100'),
        API.get('/videos?limit=100'),
      ]);
      setSongs(songRes.data.songs || songRes.data || []);
      setVideos(videoRes.data.videos || videoRes.data || []);
    } catch (err) { /* ignore */ }
  };

  const fetchFriends = async () => {
    try {
      const { data } = await API.get('/friends');
      setFriends(data);
    } catch (err) { /* ignore */ }
  };

  // Get the active media element
  const getMediaEl = useCallback(() => {
    if (!activeParty?.currentMedia) return null;
    return activeParty.currentMedia.type === 'video' ? videoRef.current : audioRef.current;
  }, [activeParty?.currentMedia?.type]);

  // Socket listeners for the active party
  useEffect(() => {
    if (!activeParty) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join-party', activeParty._id);

    const onPlaybackSync = ({ isPlaying: ip, currentTime: ct }) => {
      syncLockRef.current = true;
      setIsPlaying(ip);
      const el = getMediaEl();
      if (el && Math.abs(el.currentTime - ct) > 1.5) el.currentTime = ct;
      if (ip) el?.play().catch(() => {});
      else el?.pause();
      setTimeout(() => { syncLockRef.current = false; }, 500);
    };

    const onSeekSync = ({ currentTime: ct }) => {
      syncLockRef.current = true;
      const el = getMediaEl();
      if (el) el.currentTime = ct;
      setTimeout(() => { syncLockRef.current = false; }, 500);
    };

    const onMediaChanged = ({ currentMedia, playbackState }) => {
      setActiveParty(prev => prev ? { ...prev, currentMedia, playbackState } : prev);
      setIsPlaying(playbackState?.isPlaying ?? true);
      setCurrentTime(0);
    };

    const onQueueUpdated = (queue) => {
      setActiveParty(prev => prev ? { ...prev, queue } : prev);
    };

    const onChatMessage = (msg) => {
      setChatMessages(prev => [...prev, msg]);
    };

    const onUserJoined = ({ userId, name, profilePhoto }) => {
      toast.success(`${name} joined the party!`);
      setActiveParty(prev => {
        if (!prev) return prev;
        const already = prev.participants?.some(p => p._id === userId);
        if (already) return prev;
        return { ...prev, participants: [...(prev.participants || []), { _id: userId, name, profilePhoto }] };
      });
    };

    const onUserLeft = ({ userId, name }) => {
      toast(`${name} left the party`);
      setActiveParty(prev => prev ? {
        ...prev, participants: prev.participants?.filter(p => p._id !== userId) || [],
      } : prev);
    };

    const onTrackSkipped = () => {
      setActiveParty(prev => {
        if (!prev || !prev.queue?.length) return prev;
        const next = prev.queue[0];
        return { ...prev, currentMedia: next, queue: prev.queue.slice(1) };
      });
      setCurrentTime(0);
      setIsPlaying(true);
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
  }, [activeParty?._id, getMediaEl]);

  // Auto-play when media source changes (sync for non-host users)
  useEffect(() => {
    if (!activeParty?.currentMedia?.url) return;
    const el = getMediaEl();
    if (!el) return;
    const playWhenReady = () => {
      if (activeParty.playbackState?.currentTime) {
        el.currentTime = activeParty.playbackState.currentTime;
      }
      if (isPlaying || activeParty.playbackState?.isPlaying) {
        el.play().catch(() => {});
      }
    };
    el.addEventListener('loadeddata', playWhenReady, { once: true });
    return () => el.removeEventListener('loadeddata', playWhenReady);
  }, [activeParty?.currentMedia?.url, getMediaEl]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Time update for progress bar
  const handleTimeUpdate = () => {
    const el = getMediaEl();
    if (el) {
      setCurrentTime(el.currentTime);
      setDuration(el.duration || activeParty?.currentMedia?.duration || 0);
    }
  };

  // Auto-advance when track ends
  const handleMediaEnded = () => {
    if (!isHost) return;
    if (activeParty?.queue?.length > 0) {
      handleSkip();
    } else {
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (!isHost) return toast('Only the host can control playback');
    const next = !isPlaying;
    setIsPlaying(next);
    const el = getMediaEl();
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
    const el = getMediaEl();
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
      setChatMessages(data.chat || []);
      setShowCreate(false);
      setPartyName('');
      toast.success('Party created!');
    } catch (err) { toast.error('Failed to create party'); }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      const { data } = await API.post(`/parties/join/${joinCode.trim()}`);
      const full = await API.get(`/parties/${data._id}`);
      setActiveParty(full.data);
      setChatMessages(full.data.chat || []);
      setIsPlaying(full.data.playbackState?.isPlaying || false);
      setShowJoin(false);
      setJoinCode('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to join'); }
  };

  const handleJoinParty = async (party) => {
    try {
      const { data } = await API.get(`/parties/${party._id}`);
      setActiveParty(data);
      setChatMessages(data.chat || []);
      setIsPlaying(data.playbackState?.isPlaying || false);
    } catch (err) { toast.error('Failed to load party'); }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    const text = chatMsg.trim();
    setChatMsg('');
    getSocket()?.emit('party-chat', { partyId: activeParty._id, message: text });
    try { await API.post(`/parties/${activeParty._id}/chat`, { message: text }); } catch {}
  };

  const handleEndParty = async () => {
    try {
      await API.put(`/parties/${activeParty._id}/end`);
      setActiveParty(null);
      fetchParties();
    } catch (err) { toast.error('Failed'); }
  };

  const handleDeleteParty = async (partyId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this party permanently?')) return;
    try {
      await API.delete(`/parties/${partyId}`);
      toast.success('Party deleted');
      if (activeParty?._id === partyId) setActiveParty(null);
      fetchParties();
    } catch (err) { toast.error('Failed to delete'); }
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
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <HiSignal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Watch Party</h1>
                <p className="text-white/60 text-sm mt-0.5">Listen & watch together with friends in real-time</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all">
                <HiPlus className="w-4 h-4" /> Create Party
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowJoin(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white rounded-xl text-sm font-bold transition-all border border-white/20">
                <HiLink className="w-4 h-4" /> Join with Code
              </motion.button>
            </div>
          </div>
        </div>

        {/* Active Parties */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <HiSignal className="w-4 h-4" /> Your Parties
          </h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : parties.length === 0 ? (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-16 text-center shadow-sm border border-gray-100/50 dark:border-dark-border/50">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/20 dark:to-fuchsia-900/20 flex items-center justify-center mx-auto mb-4">
                <HiUserGroup className="w-10 h-10 text-purple-300 dark:text-purple-700" />
              </div>
              <p className="text-gray-500 font-semibold">No active parties</p>
              <p className="text-sm text-gray-400 mt-1">Create one to start listening together!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {parties.map(p => (
                <motion.div key={p._id} whileHover={{ y: -3, scale: 1.01 }}
                  className="bg-white dark:bg-dark-card rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-lg transition-all border border-gray-100/50 dark:border-dark-border/50 group relative">
                  <div onClick={() => handleJoinParty(p)} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 dark:from-violet-500/30 dark:to-fuchsia-500/30 flex items-center justify-center flex-shrink-0">
                      {p.currentMedia?.type === 'video'
                        ? <HiFilm className="w-7 h-7 text-fuchsia-500" />
                        : <HiMusicalNote className="w-7 h-7 text-violet-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Hosted by {p.host?.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2.5 py-0.5 rounded-full font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {p.participants?.length || 0} listening
                        </span>
                        {p.currentMedia?.title && (
                          <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                            {p.currentMedia.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Delete button for host */}
                  {p.host?._id === user?._id && (
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleDeleteParty(p._id, e)}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete party">
                      <HiTrash className="w-4 h-4" />
                    </motion.button>
                  )}
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
                className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold">Create a Party</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"><HiXMark className="w-5 h-5" /></button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Party Name</label>
                  <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)}
                    placeholder="e.g. Friday Night Vibes" className="input-field w-full" autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreateParty()} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">Cancel</button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreateParty}
                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all">Create</motion.button>
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
                className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold">Join with Invite Code</h3>
                  <button onClick={() => setShowJoin(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"><HiXMark className="w-5 h-5" /></button>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Invite Code</label>
                  <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)}
                    placeholder="Enter 8-character code" className="input-field w-full font-mono text-center text-lg tracking-widest" autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleJoinByCode()} maxLength={8} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">Cancel</button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleJoinByCode}
                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all">Join</motion.button>
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
      <div className="flex items-center justify-between bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-dark-border/50">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={isHost ? handleEndParty : handleLeaveParty}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors group">
            <HiArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </motion.button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold">{activeParty.name}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {isHost ? 'You are hosting' : `Hosted by ${activeParty.host?.name}`} · {activeParty.participants?.length} listening
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowInvite(true)}
            className="p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 transition-colors" title="Invite Friends">
            <HiUserPlus className="w-5 h-5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={copyInviteCode}
            className="p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500 transition-colors" title="Copy Code">
            <HiClipboard className="w-5 h-5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowQueue(!showQueue)}
            className={`p-2.5 rounded-xl transition-colors ${showQueue ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500'}`}>
            <HiQueueList className="w-5 h-5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowChat(!showChat)}
            className={`p-2.5 rounded-xl transition-colors ${showChat ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500'}`}>
            <HiChatBubbleLeft className="w-5 h-5" />
          </motion.button>
          {isHost && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDeleteParty(activeParty._id)}
              className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors" title="Delete Party">
              <HiTrash className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Media Player */}
          <div className="bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-gray-100/50 dark:border-dark-border/50">
            {isVideo && mediaUrl ? (
              <video ref={videoRef} src={mediaUrl} className="w-full aspect-video bg-black"
                onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} onEnded={handleMediaEnded} />
            ) : (
              <div className="p-6 flex items-center gap-5">
                <motion.div animate={isPlaying ? { rotate: 360 } : {}}
                  transition={isPlaying ? { repeat: Infinity, duration: 8, ease: 'linear' } : {}}
                  className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg">
                  {media?.coverArt ? (
                    <img src={media.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <HiMusicalNote className="w-10 h-10 text-purple-400" />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-extrabold truncate">{media?.title || 'No track selected'}</p>
                  <p className="text-sm text-gray-400">{media?.artist || (isHost ? 'Select a song or video below' : 'Waiting for host to play something...')}</p>
                  {isPlaying && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex gap-0.5">
                        {[...Array(4)].map((_, i) => (
                          <motion.div key={i} animate={{ height: [4, 14, 4] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                            className="w-1 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-full" />
                        ))}
                      </div>
                      <span className="text-xs text-purple-500 font-semibold ml-1">Playing</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hidden audio element */}
            {!isVideo && mediaUrl && (
              <audio ref={audioRef} src={mediaUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} onEnded={handleMediaEnded} />
            )}

            {/* Progress & Controls */}
            <div className="px-6 pb-5 space-y-3">
              <div className="space-y-1">
                <div className={`h-2 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden ${isHost ? 'cursor-pointer hover:h-3 transition-all' : ''}`}
                  onClick={handleSeek}>
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                {isHost ? (
                  <>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleSkip}
                      className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 transition-colors">
                      <HiForward className="w-5 h-5 rotate-180" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handlePlayPause}
                      className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white flex items-center justify-center shadow-xl shadow-purple-500/25 transition-all">
                      {isPlaying ? <HiPause className="w-7 h-7" /> : <HiPlay className="w-7 h-7 ml-0.5" />}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleSkip}
                      className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 transition-colors">
                      <HiForward className="w-5 h-5" />
                    </motion.button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <HiSpeakerWave className="w-4 h-4" />
                    <span className="font-medium">{isPlaying ? 'Playing...' : 'Paused'} · Host controls playback</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media Library (Host) */}
          {isHost && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-5 space-y-4 shadow-sm border border-gray-100/50 dark:border-dark-border/50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Media Library</h3>
                <div className="flex gap-1">
                  <button onClick={() => setMediaTab('songs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mediaTab === 'songs' ? 'bg-violet-100 dark:bg-violet-900/20 text-violet-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}>
                    <HiMusicalNote className="w-3.5 h-3.5" /> Songs ({songs.length})
                  </button>
                  <button onClick={() => setMediaTab('videos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mediaTab === 'videos' ? 'bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}>
                    <HiFilm className="w-3.5 h-3.5" /> Videos ({videos.length})
                  </button>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-hide">
                {(mediaTab === 'songs' ? songs : videos).length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No {mediaTab} uploaded yet.</p>
                ) : (
                  (mediaTab === 'songs' ? songs : videos).map(item => (
                    <motion.div key={item._id} whileHover={{ x: 2 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover/50 group transition-colors">
                      <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(item.coverArt || item.thumbnailUrl) ? (
                          <img src={item.coverArt || item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : mediaTab === 'songs' ? (
                          <HiMusicalNote className="w-5 h-5 text-gray-400" />
                        ) : (
                          <HiFilm className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{item.artist || ''}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => handleChangeMedia({ ...item, type: mediaTab === 'songs' ? 'song' : 'video', url: item.audioUrl || item.videoUrl })}
                          className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 transition-colors" title="Play Now">
                          <HiPlay className="w-4 h-4" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddToQueue(item, mediaTab === 'songs' ? 'song' : 'video')}
                          className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors" title="Add to Queue">
                          <HiPlus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Non-host can add to queue */}
          {!isHost && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-5 space-y-4 shadow-sm border border-gray-100/50 dark:border-dark-border/50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Add to Queue</h3>
                <div className="flex gap-1">
                  <button onClick={() => setMediaTab('songs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mediaTab === 'songs' ? 'bg-violet-100 dark:bg-violet-900/20 text-violet-600' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    <HiMusicalNote className="w-3.5 h-3.5" /> Songs
                  </button>
                  <button onClick={() => setMediaTab('videos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mediaTab === 'videos' ? 'bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    <HiFilm className="w-3.5 h-3.5" /> Videos
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                {(mediaTab === 'songs' ? songs : videos).map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover/50 group">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {(item.coverArt || item.thumbnailUrl) ? (
                        <img src={item.coverArt || item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : <HiMusicalNote className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.title}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => handleAddToQueue(item, mediaTab === 'songs' ? 'song' : 'video')}
                      className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <HiPlus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
          {/* Participants */}
          <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-dark-border/50">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <HiUserGroup className="w-3.5 h-3.5" /> Participants ({activeParty.participants?.length || 0})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
              {activeParty.participants?.map(p => (
                <div key={p._id} className="flex items-center gap-2.5">
                  <div className="relative">
                    {p.profilePhoto ? (
                      <img src={p.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-dark-hover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-gray-100 dark:ring-dark-hover">
                        {p.name?.[0]}
                      </div>
                    )}
                    {p._id === activeParty.host?._id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-[7px] text-white font-extrabold">H</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold truncate">{p.name}</span>
                    {p._id === activeParty.host?._id && <span className="text-[10px] text-amber-500 font-medium ml-1">Host</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue */}
          <AnimatePresence>
            {showQueue && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100/50 dark:border-dark-border/50 overflow-hidden">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <HiQueueList className="w-3.5 h-3.5" /> Queue ({activeParty.queue?.length || 0})
                </h3>
                {activeParty.queue?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                    {activeParty.queue.map((q, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs py-1">
                        <span className="text-gray-400 w-5 text-center font-mono">{i + 1}</span>
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {q.coverArt ? <img src={q.coverArt} alt="" className="w-full h-full object-cover" /> :
                            q.type === 'video' ? <HiFilm className="w-3.5 h-3.5 text-gray-400" /> : <HiMusicalNote className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{q.title}</p>
                          {q.artist && <p className="text-[10px] text-gray-400 truncate">{q.artist}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400">Queue is empty</p>
                    <p className="text-[10px] text-gray-300 mt-1">Add songs or videos to play next</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat */}
          {showChat && (
            <div className="bg-white dark:bg-dark-card rounded-2xl flex flex-col shadow-sm border border-gray-100/50 dark:border-dark-border/50" style={{ height: '380px' }}>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 dark:from-violet-900/10 dark:to-fuchsia-900/10 rounded-t-2xl">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <HiChatBubbleLeft className="w-3.5 h-3.5" /> Party Chat
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-hide">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-300 dark:text-gray-600">
                    <HiChatBubbleLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Say hi to start chatting!</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    {msg.senderPhoto ? (
                      <img src={msg.senderPhoto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {msg.senderName?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">{msg.senderName}</span>
                        <span className="text-[9px] text-gray-300">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="p-3 border-t border-gray-100 dark:border-dark-border flex gap-2">
                <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  placeholder="Type a message..." className="input-field flex-1 text-xs !py-2 rounded-xl bg-gray-50 dark:bg-dark-elevated" />
                <motion.button whileTap={{ scale: 0.9 }} type="submit"
                  className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg transition-all">
                  <HiPaperAirplane className="w-4 h-4" />
                </motion.button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Invite Friends Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvite(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold">Invite Friends</h3>
                <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"><HiXMark className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-2 p-3.5 bg-gray-50 dark:bg-dark-hover rounded-xl border border-gray-200/50 dark:border-dark-border/50">
                <span className="text-base font-mono font-bold flex-1 text-center tracking-[0.3em]">{activeParty.inviteCode}</span>
                <motion.button whileTap={{ scale: 0.95 }} onClick={copyInviteCode}
                  className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/20 text-violet-600 text-xs font-bold rounded-lg">Copy</motion.button>
              </div>
              {friends.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {friends.map(f => (
                    <div key={f._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover/50 transition-colors">
                      {f.profilePhoto ? (
                        <img src={f.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">{f.name?.[0]}</div>
                      )}
                      <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => inviteFriend(f._id)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-sm">
                        Invite
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WatchPartyRoom;
