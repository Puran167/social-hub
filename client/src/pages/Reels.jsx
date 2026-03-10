import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiHeart, HiChatBubbleLeft, HiShare, HiMusicalNote, HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';

const Reels = () => {
  const { user } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeReel, setActiveReel] = useState(0);
  const [showComments, setShowComments] = useState(null);
  const [commentText, setCommentText] = useState('');
  const containerRef = useRef(null);
  const videoRefs = useRef({});

  useEffect(() => { fetchReels(); }, []);

  const fetchReels = async () => {
    try {
      const { data } = await API.get('/reels');
      setReels(data || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a video');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('caption', caption);
      await API.post('/reels', form);
      fetchReels();
      setShowUpload(false);
      setFile(null);
      setCaption('');
      toast.success('Reel uploaded!');
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
  };

  const handleLike = async (reelId) => {
    try {
      const { data } = await API.put(`/reels/like/${reelId}`);
      setReels(prev => prev.map(r => r._id === reelId ? data : r));
    } catch (err) { /* ignore */ }
  };

  const handleComment = async (e, reelId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await API.post(`/reels/comment/${reelId}`, { text: commentText });
      setReels(prev => prev.map(r => r._id === reelId ? data : r));
      setCommentText('');
    } catch (err) { toast.error('Comment failed'); }
  };

  // Intersection observer for auto-play on scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const reelElements = container.querySelectorAll('.reel-item');
    reelElements.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.top < window.innerHeight * 0.5;
      if (inView && activeReel !== i) {
        setActiveReel(i);
        // Pause all, play active
        Object.values(videoRefs.current).forEach(v => { if (v) v.pause(); });
        if (videoRefs.current[i]) {
          videoRefs.current[i].currentTime = 0;
          videoRefs.current[i].play().catch(() => {});
        }
        // Track view
        if (reels[i]) API.put(`/reels/view/${reels[i]._id}`).catch(() => {});
      }
    });
  }, [activeReel, reels]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => { if (container) container.removeEventListener('scroll', handleScroll); };
  }, [handleScroll]);

  if (loading) return <LoadingSpinner size="lg" text="Loading reels..." />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Reels</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary text-sm flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Create Reel
        </button>
      </div>

      {/* Vertical Scroll Reel Feed */}
      <div ref={containerRef} className="h-[80vh] overflow-y-scroll snap-y snap-mandatory mx-auto max-w-md rounded-2xl"
        style={{ scrollBehavior: 'smooth' }}>
        {reels.map((reel, i) => (
          <div key={reel._id} className="reel-item snap-start h-[80vh] relative bg-black rounded-2xl overflow-hidden mb-2">
            <video ref={el => videoRefs.current[i] = el}
              src={reel.videoUrl} className="w-full h-full object-cover"
              loop muted={muted} playsInline
              onClick={() => {
                const v = videoRefs.current[i];
                if (v) v.paused ? v.play() : v.pause();
              }} />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Right sidebar actions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
              {/* Profile */}
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                {reel.user?.profilePhoto ?
                  <img src={reel.user.profilePhoto} alt="" className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center bg-accent-pink text-sm font-bold">{reel.user?.name?.[0]}</div>
                }
              </div>
              {/* Like */}
              <button onClick={() => handleLike(reel._id)} className="flex flex-col items-center gap-1">
                <HiHeart className={`w-7 h-7 ${reel.likes?.includes(user?._id) ? 'text-red-500' : 'text-white'}`} />
                <span className="text-xs">{reel.likes?.length || 0}</span>
              </button>
              {/* Comment */}
              <button onClick={() => setShowComments(reel._id)} className="flex flex-col items-center gap-1">
                <HiChatBubbleLeft className="w-7 h-7" />
                <span className="text-xs">{reel.comments?.length || 0}</span>
              </button>
              {/* Share */}
              <button className="flex flex-col items-center gap-1">
                <HiShare className="w-7 h-7" />
                <span className="text-xs">{reel.shares || 0}</span>
              </button>
              {/* Mute toggle */}
              <button onClick={() => setMuted(!muted)}>
                {muted ? <HiSpeakerXMark className="w-6 h-6" /> : <HiSpeakerWave className="w-6 h-6" />}
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-4 left-4 right-16">
              <p className="text-sm font-medium">{reel.user?.name}</p>
              <p className="text-sm text-white/80 mt-1">{reel.caption}</p>
              {reel.musicTitle && (
                <div className="flex items-center gap-1 mt-2 text-xs text-white/60">
                  <HiMusicalNote className="w-3 h-3" /> {reel.musicTitle}
                </div>
              )}
            </div>
          </div>
        ))}
        {reels.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            No reels yet. Create the first one!
          </div>
        )}
      </div>

      {/* Comments Modal */}
      <Modal isOpen={!!showComments} onClose={() => setShowComments(null)} title="Comments" size="sm">
        {showComments && (() => {
          const reel = reels.find(r => r._id === showComments);
          if (!reel) return null;
          return (
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-3">
                {reel.comments?.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-hover flex-shrink-0 overflow-hidden">
                      {c.user?.profilePhoto ? <img src={c.user.profilePhoto} alt="" className="w-full h-full object-cover" /> :
                        <span className="text-xs flex items-center justify-center h-full">{c.user?.name?.[0]}</span>}
                    </div>
                    <div>
                      <span className="text-xs font-medium">{c.user?.name}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{c.text}</p>
                    </div>
                  </div>
                ))}
                {(!reel.comments || reel.comments.length === 0) && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No comments yet</p>}
              </div>
              <form onSubmit={(e) => handleComment(e, reel._id)} className="flex gap-2 border-t border-gray-200 dark:border-dark-border pt-3">
                <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                  className="input-field flex-1 py-2 text-sm" placeholder="Add a comment..." />
                <button type="submit" className="text-sm text-primary dark:text-primary-dark font-medium">Post</button>
              </form>
            </div>
          );
        })()}
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Create Reel" size="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <FileDropzone onDrop={(files) => setFile(files[0])} accept={{ 'video/*': ['.mp4', '.mov', '.webm'] }}
            label="Drop your short video here">
            {file && <p className="text-sm text-primary dark:text-primary-dark">{file.name}</p>}
          </FileDropzone>
          <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
            className="input-field w-full" placeholder="Add a caption..." maxLength={300} />
          <button type="submit" disabled={uploading} className="btn-primary w-full disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Share Reel'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Reels;
