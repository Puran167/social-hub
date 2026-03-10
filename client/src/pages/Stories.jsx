import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiXMark, HiChevronLeft, HiChevronRight, HiEye } from 'react-icons/hi2';
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
  const [viewingGroup, setViewingGroup] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

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

  // Story viewer logic
  const openStory = (group, index = 0) => {
    setViewingGroup(group);
    setViewingIndex(index);
    setProgress(0);
    // Mark as viewed
    if (group.stories[index]) {
      API.put(`/stories/view/${group.stories[index]._id}`).catch(() => {});
    }
  };

  useEffect(() => {
    if (!viewingGroup) return;
    const duration = viewingGroup.stories[viewingIndex]?.type === 'video' ? 15000 : 5000;
    const interval = 50;
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      if (elapsed >= duration) nextStoryItem();
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [viewingGroup, viewingIndex]);

  const nextStoryItem = () => {
    if (!viewingGroup) return;
    if (viewingIndex < viewingGroup.stories.length - 1) {
      const newIdx = viewingIndex + 1;
      setViewingIndex(newIdx);
      setProgress(0);
      API.put(`/stories/view/${viewingGroup.stories[newIdx]._id}`).catch(() => {});
    } else {
      // Next group or close
      const currentGroupIdx = storyGroups.indexOf(viewingGroup);
      if (currentGroupIdx < storyGroups.length - 1) {
        openStory(storyGroups[currentGroupIdx + 1], 0);
      } else {
        closeViewer();
      }
    }
  };

  const prevStoryItem = () => {
    if (viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1);
      setProgress(0);
    }
  };

  const closeViewer = () => {
    clearInterval(timerRef.current);
    setViewingGroup(null);
    setViewingIndex(0);
    setProgress(0);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading stories..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stories</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary text-sm flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Story
        </button>
      </div>

      {/* Story Circles - Instagram style */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Add story */}
        <button onClick={() => setShowUpload(true)}
          className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-full bg-white dark:bg-white dark:bg-dark-card border-2 border-dashed border-white/20 flex items-center justify-center hover:border-primary transition-all">
            <HiPlus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Your Story</span>
        </button>

        {storyGroups.map((group, gi) => (
          <button key={gi} onClick={() => openStory(group)}
            className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="story-ring">
              <div className="w-20 h-20 rounded-full bg-surface dark:bg-surface dark:bg-dark-bg overflow-hidden border-2 border-gray-200 dark:border-dark-border">
                {group.user?.profilePhoto ? (
                  <img src={group.user.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-accent-pink to-primary">
                    {group.user?.name?.[0]}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs truncate w-20 text-center">{group.user?.name?.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {storyGroups.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p>No stories from friends yet. Be the first to share!</p>
        </div>
      )}

      {/* Story Viewer - Full screen */}
      {viewingGroup && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Progress bars */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {viewingGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-75"
                  style={{ width: i < viewingIndex ? '100%' : i === viewingIndex ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>

          {/* User info */}
          <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-elevated">
                {viewingGroup.user?.profilePhoto ?
                  <img src={viewingGroup.user.profilePhoto} alt="" className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold">{viewingGroup.user?.name?.[0]}</div>
                }
              </div>
              <span className="text-sm font-medium">{viewingGroup.user?.name}</span>
              <span className="text-xs text-white/60">{new Date(viewingGroup.stories[viewingIndex]?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button onClick={closeViewer} className="p-1"><HiXMark className="w-6 h-6" /></button>
          </div>

          {/* Media */}
          <div className="w-full h-full flex items-center justify-center">
            {viewingGroup.stories[viewingIndex]?.type === 'video' ? (
              <video src={viewingGroup.stories[viewingIndex].mediaUrl} autoPlay className="max-w-full max-h-full object-contain" />
            ) : (
              <img src={viewingGroup.stories[viewingIndex]?.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </div>

          {/* Caption */}
          {viewingGroup.stories[viewingIndex]?.caption && (
            <div className="absolute bottom-16 left-0 right-0 text-center px-8">
              <p className="text-sm bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                {viewingGroup.stories[viewingIndex].caption}
              </p>
            </div>
          )}

          {/* Navigation */}
          <button onClick={prevStoryItem} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:bg-dark-elevated">
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextStoryItem} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:bg-dark-elevated">
            <HiChevronRight className="w-5 h-5" />
          </button>

          {/* Viewers */}
          {viewingGroup.user?._id === user?._id && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1 text-sm text-white/60">
              <HiEye className="w-4 h-4" />
              <span>{viewingGroup.stories[viewingIndex]?.viewers?.length || 0} views</span>
            </div>
          )}
        </div>
      )}

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
