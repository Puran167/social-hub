import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiXMark, HiChevronLeft, HiChevronRight, HiEye, HiPause, HiPlay } from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';

const Stories = () => {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState('photo');
  const [uploading, setUploading] = useState(false);
  // Story viewer
  const [viewingGroupIdx, setViewingGroupIdx] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const viewingGroup = viewingGroupIdx !== null ? storyGroups[viewingGroupIdx] : null;

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      const { data } = await API.get('/stories');
      setStoryGroups(data || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a file');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('type', mediaType);
      form.append('caption', caption);
      await API.post('/stories', form);
      fetchStories();
      setShowUpload(false);
      setFile(null);
      setCaption('');
      toast.success('Story uploaded!');
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
  };

  // Open story viewer
  const openStory = (groupIdx, storyIdx = 0) => {
    setViewingGroupIdx(groupIdx);
    setViewingIndex(storyIdx);
    setProgress(0);
    setPaused(false);
    const group = storyGroups[groupIdx];
    if (group?.stories[storyIdx]) {
      API.put(`/stories/view/${group.stories[storyIdx]._id}`).catch(() => {});
    }
  };

  // Auto-advance timer
  useEffect(() => {
    if (viewingGroupIdx === null || paused) {
      clearInterval(timerRef.current);
      return;
    }
    const currentStory = viewingGroup?.stories[viewingIndex];
    const duration = currentStory?.type === 'video' ? 15000 : 5000;
    const interval = 50;
    let elapsed = (progress / 100) * duration;

    timerRef.current = setInterval(() => {
      elapsed += interval;
      const pct = (elapsed / duration) * 100;
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(timerRef.current);
        nextStoryItem();
      }
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [viewingGroupIdx, viewingIndex, paused]);

  const nextStoryItem = () => {
    if (viewingGroup === null) return;
    if (viewingIndex < viewingGroup.stories.length - 1) {
      const newIdx = viewingIndex + 1;
      setViewingIndex(newIdx);
      setProgress(0);
      API.put(`/stories/view/${viewingGroup.stories[newIdx]._id}`).catch(() => {});
    } else if (viewingGroupIdx < storyGroups.length - 1) {
      openStory(viewingGroupIdx + 1, 0);
    } else {
      closeViewer();
    }
  };

  const prevStoryItem = () => {
    if (viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1);
      setProgress(0);
    } else if (viewingGroupIdx > 0) {
      const prevGroup = storyGroups[viewingGroupIdx - 1];
      openStory(viewingGroupIdx - 1, prevGroup.stories.length - 1);
    }
  };

  const closeViewer = () => {
    clearInterval(timerRef.current);
    setViewingGroupIdx(null);
    setViewingIndex(0);
    setProgress(0);
    setPaused(false);
  };

  const togglePause = () => {
    setPaused(p => !p);
    if (videoRef.current) {
      paused ? videoRef.current.play() : videoRef.current.pause();
    }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading stories..." />;

  const currentStory = viewingGroup?.stories[viewingIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Stories</h1>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 nebula-gradient text-white text-sm font-semibold rounded-xl shadow-glow-sm hover:shadow-glow transition-shadow">
          <HiPlus className="w-4 h-4" /> Add Story
        </button>
      </div>

      {/* Story Circles Row - Instagram style */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Add your story */}
        <button onClick={() => setShowUpload(true)}
          className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="relative w-[72px] h-[72px]">
            <div className="w-full h-full rounded-full bg-gray-100 dark:bg-dark-hover overflow-hidden border-2 border-gray-200 dark:border-dark-border">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500 dark:text-gray-400 bg-gradient-to-br from-primary/20 to-accent-pink/20">
                  {user?.name?.[0]}
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary border-2 border-white dark:border-dark-bg flex items-center justify-center">
              <HiPlus className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Your Story</span>
        </button>

        {storyGroups.map((group, gi) => {
          const hasUnviewed = group.stories.some(s =>
            !s.viewers?.some(v => (v.user?._id || v.user) === user?._id)
          );
          return (
            <button key={gi} onClick={() => openStory(gi)}
              className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className={`p-[3px] rounded-full ${hasUnviewed ? 'bg-gradient-to-tr from-yellow-400 via-accent-coral to-accent-pink' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className="w-[66px] h-[66px] rounded-full bg-white dark:bg-dark-bg p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-dark-hover">
                    {group.user?.profilePhoto ? (
                      <img src={group.user.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-accent-pink to-primary">
                        {group.user?.name?.[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[11px] truncate w-[72px] text-center text-gray-700 dark:text-gray-300 font-medium">
                {group.user?._id === user?._id ? 'Your Story' : group.user?.name?.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {storyGroups.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-accent-pink/10 flex items-center justify-center mb-4">
            <HiPlus className="w-8 h-8 text-primary/50" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">No stories yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Share your first story!</p>
          <button onClick={() => setShowUpload(true)}
            className="mt-4 px-6 py-2.5 nebula-gradient text-white rounded-2xl text-sm font-semibold shadow-glow-sm hover:shadow-glow transition-shadow">
            Add Story
          </button>
        </div>
      )}

      {/* ========== FULL-SCREEN STORY VIEWER (Instagram-like) ========== */}
      <AnimatePresence>
        {viewingGroup && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            {/* Centered story card */}
            <div className="w-full h-full flex items-center justify-center">
              {/* Story container — phone-shaped on desktop, full on mobile */}
              <div className="relative w-full h-full sm:w-[420px] sm:h-[95vh] sm:max-h-[860px] sm:rounded-2xl overflow-hidden bg-black">

                {/* Background blur layer for images that don't fill */}
                {currentStory.type !== 'video' && (
                  <div className="absolute inset-0">
                    <img src={currentStory.mediaUrl} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-40" />
                  </div>
                )}

                {/* Main media */}
                <div className="absolute inset-0 flex items-center justify-center" onClick={togglePause}>
                  {currentStory.type === 'video' ? (
                    <video
                      ref={videoRef}
                      src={currentStory.mediaUrl}
                      autoPlay
                      playsInline
                      muted={false}
                      className="w-full h-full object-contain"
                      onEnded={nextStoryItem}
                    />
                  ) : (
                    <img
                      src={currentStory.mediaUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Top gradient overlay */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

                {/* Bottom gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />

                {/* Progress bars */}
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                  {viewingGroup.stories.map((_, i) => (
                    <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{
                          width: i < viewingIndex ? '100%' : i === viewingIndex ? `${progress}%` : '0%',
                          transition: i === viewingIndex ? 'width 50ms linear' : 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* User info header */}
                <div className="absolute top-5 left-3 right-3 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/30">
                      {viewingGroup.user?.profilePhoto ? (
                        <img src={viewingGroup.user.profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-primary to-accent-pink">
                          {viewingGroup.user?.name?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white drop-shadow-lg">{viewingGroup.user?.name}</p>
                      <p className="text-[11px] text-white/60">{timeAgo(currentStory.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={togglePause} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      {paused ? <HiPlay className="w-5 h-5 text-white" /> : <HiPause className="w-5 h-5 text-white" />}
                    </button>
                    <button onClick={closeViewer} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <HiXMark className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Left/Right tap zones for navigation */}
                <div className="absolute inset-0 z-10 flex">
                  <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); prevStoryItem(); }} />
                  <div className="w-1/3 h-full" />
                  <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); nextStoryItem(); }} />
                </div>

                {/* Caption */}
                {currentStory.caption && (
                  <div className="absolute bottom-6 left-0 right-0 text-center px-6 z-20">
                    <p className="text-sm text-white bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl inline-block max-w-full drop-shadow-lg">
                      {currentStory.caption}
                    </p>
                  </div>
                )}

                {/* View count for own stories */}
                {viewingGroup.user?._id === user?._id && (
                  <div className="absolute bottom-6 left-4 flex items-center gap-1.5 z-20">
                    <HiEye className="w-4 h-4 text-white/70" />
                    <span className="text-sm text-white/70 font-medium">{currentStory.viewers?.length || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop prev/next arrows (outside the card) */}
            <button
              onClick={prevStoryItem}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm items-center justify-center transition-colors z-30"
            >
              <HiChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={nextStoryItem}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm items-center justify-center transition-colors z-30"
            >
              <HiChevronRight className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Add Story" size="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMediaType('photo')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mediaType === 'photo' ? 'nebula-gradient text-white' : 'bg-gray-100/80 dark:bg-dark-hover/80'}`}>
              Photo
            </button>
            <button type="button" onClick={() => setMediaType('video')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mediaType === 'video' ? 'nebula-gradient text-white' : 'bg-gray-100/80 dark:bg-dark-hover/80'}`}>
              Video
            </button>
          </div>
          <FileDropzone onDrop={(files) => setFile(files[0])}
            accept={mediaType === 'photo' ? { 'image/*': [] } : { 'video/*': [] }}
            label={`Drop your ${mediaType} here`}>
            {file && <p className="text-sm text-primary dark:text-primary-dark">{file.name}</p>}
          </FileDropzone>
          <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
            className="input-field w-full" placeholder="Add a caption..." maxLength={200} />
          <button type="submit" disabled={uploading} className="btn-primary w-full disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Share Story'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Stories;
