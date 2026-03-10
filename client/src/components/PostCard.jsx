import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  HiHeart, HiChatBubbleOvalLeft, HiEllipsisHorizontal, HiPaperAirplane,
  HiPlay, HiPause, HiMusicalNote, HiPencil, HiTrash, HiSpeakerWave, HiSpeakerXMark,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';

const formatTime = (sec) => {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const PostCard = ({ post, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes?.some(l => (l._id || l) === user?._id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef(null);
  const isOwner = post.user?._id === user?._id;

  const toggleLike = async () => {
    try {
      const { data } = await API.put(`/posts/${post._id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likes.length);
    } catch (err) { toast.error('Failed to like'); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await API.post(`/posts/${post._id}/comments`, { text: commentText });
      setComments(data);
      setCommentText('');
    } catch (err) { toast.error('Failed to comment'); }
  };

  const deleteComment = async (commentId) => {
    try {
      await API.delete(`/posts/${post._id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) { toast.error('Failed to delete comment'); }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(ct);
    setDuration(dur);
    setProgress((ct / dur) * 100 || 0);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const handleVolume = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(pct);
    if (audioRef.current) audioRef.current.volume = pct;
    if (pct > 0) setMuted(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted;
    setMuted(next);
    audioRef.current.volume = next ? 0 : volume;
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.user?._id}`} className="flex items-center gap-3">
          {post.user?.profilePhoto ? (
            <img src={post.user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
              {post.user?.name?.[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{post.user?.name}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(post.createdAt)}</p>
          </div>
        </Link>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl transition-colors">
              <HiEllipsisHorizontal className="w-5 h-5 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-dark-elevated rounded-xl shadow-xl border border-gray-200/60 dark:border-dark-border/60 py-1 z-20 min-w-[140px]">
                <button onClick={() => { setShowMenu(false); onUpdate?.(post); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-gray-700 dark:text-gray-300">
                  <HiPencil className="w-4 h-4" /> Edit Post
                </button>
                <button onClick={() => { setShowMenu(false); onDelete?.(post._id); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-500">
                  <HiTrash className="w-4 h-4" /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.text}</p>
        </div>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="relative">
          <img src={post.imageUrl} alt="" className="w-full max-h-[500px] object-cover" />
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div className="relative bg-black">
          <video src={post.videoUrl} controls className="w-full max-h-[500px] object-contain" />
        </div>
      )}

      {/* Music Player */}
      {post.songUrl && (
        <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent-pink/10 to-accent-coral/10 dark:from-primary/15 dark:via-accent-pink/15 dark:to-accent-coral/15 border border-primary/10">
          <audio ref={audioRef} src={post.songUrl} onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setPlaying(false)} />
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button onClick={togglePlay}
              className="w-11 h-11 rounded-full nebula-gradient flex items-center justify-center shadow-glow-sm flex-shrink-0 hover:shadow-glow transition-shadow active:scale-95">
              {playing ? <HiPause className="w-5 h-5 text-white" /> : <HiPlay className="w-5 h-5 text-white ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              {/* Title */}
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate flex items-center gap-1.5">
                <HiMusicalNote className="w-4 h-4 text-primary dark:text-primary-dark flex-shrink-0" />
                {post.songTitle || 'Attached Song'}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-2 bg-gray-200/60 dark:bg-dark-border/60 rounded-full cursor-pointer overflow-hidden group relative"
                onClick={handleSeek}>
                <div className="h-full nebula-gradient rounded-full transition-[width] duration-150 relative"
                  style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              {/* Time */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-mono text-gray-400">{formatTime(currentTime)}</span>
                <span className="text-[10px] font-mono text-gray-400">{formatTime(duration)}</span>
              </div>
            </div>
            {/* Volume */}
            <div className="relative flex-shrink-0"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}>
              <button onClick={toggleMute}
                className="w-8 h-8 rounded-full hover:bg-white/40 dark:hover:bg-dark-hover/60 flex items-center justify-center transition-colors">
                {muted || volume === 0
                  ? <HiSpeakerXMark className="w-4 h-4 text-gray-400" />
                  : <HiSpeakerWave className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
              </button>
              {showVolume && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-dark-elevated rounded-xl shadow-xl border border-gray-200/60 dark:border-dark-border/60 p-2 w-8 h-24 flex flex-col items-center justify-end z-20">
                  <div className="w-1.5 flex-1 bg-gray-200 dark:bg-dark-border rounded-full relative cursor-pointer overflow-hidden"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                      setVolume(pct);
                      if (audioRef.current) audioRef.current.volume = pct;
                      if (pct > 0) setMuted(false);
                    }}>
                    <div className="absolute bottom-0 w-full nebula-gradient rounded-full" style={{ height: `${(muted ? 0 : volume) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100/60 dark:border-dark-border/30">
        <button onClick={toggleLike} className="flex items-center gap-1.5 group">
          <HiHeart className={`w-6 h-6 transition-colors ${liked ? 'text-accent-coral fill-accent-coral' : 'text-gray-400 group-hover:text-accent-coral'}`} />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 group">
          <HiChatBubbleOvalLeft className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{comments.length}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-100/60 dark:border-dark-border/30">
          {/* Comment List */}
          <div className="max-h-48 overflow-y-auto space-y-2.5 py-3">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No comments yet</p>
            )}
            {comments.map(c => (
              <div key={c._id} className="flex gap-2">
                <Link to={`/profile/${c.user?._id}`}>
                  {c.user?.profilePhoto ? (
                    <img src={c.user.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {c.user?.name?.[0]}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <Link to={`/profile/${c.user?._id}`} className="font-semibold text-gray-800 dark:text-gray-100 mr-1.5">{c.user?.name}</Link>
                    <span className="text-gray-600 dark:text-gray-300">{c.text}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                    {(c.user?._id === user?._id || isOwner) && (
                      <button onClick={() => deleteComment(c._id)} className="text-[10px] text-red-400 hover:text-red-500">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Comment Input */}
          <form onSubmit={addComment} className="flex items-center gap-2 pt-2 border-t border-gray-100/40 dark:border-dark-border/20">
            <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800 dark:text-gray-100"
              placeholder="Add a comment..." />
            <button type="submit" disabled={!commentText.trim()}
              className="text-primary dark:text-primary-dark font-semibold text-sm disabled:opacity-30">
              <HiPaperAirplane className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default PostCard;
