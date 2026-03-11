import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPhoto, HiPlus, HiHeart, HiChatBubbleLeft, HiXMark, HiPlayCircle,
  HiChevronLeft, HiChevronRight, HiArrowUpTray, HiCamera, HiSparkles,
  HiBookmark, HiPaperAirplane, HiEllipsisHorizontal
} from 'react-icons/hi2';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const Photos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [caption, setCaption] = useState('');
  const [album, setAlbum] = useState('General');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [comment, setComment] = useState('');
  const [slideshow, setSlideshow] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeAlbum, setActiveAlbum] = useState('All');
  const [showHeart, setShowHeart] = useState(null);
  const lastTapRef = useRef({});

  useEffect(() => { fetchPhotos(); }, []);

  const fetchPhotos = async () => {
    try {
      const { data } = await API.get(`/photos?user=${user._id}`);
      setPhotos(data.photos || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a photo');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('caption', caption);
      form.append('album', album);
      const { data } = await API.post('/photos', form);
      setPhotos(prev => [data, ...prev]);
      setShowUpload(false);
      setFile(null);
      setCaption('');
      toast.success('Photo uploaded!');
    } catch (err) { toast.error('Upload failed'); }
    setUploading(false);
  };

  const handleLike = async (photoId) => {
    try {
      const { data } = await API.put(`/photos/like/${photoId}`);
      setPhotos(prev => prev.map(p => p._id === photoId ? data : p));
      if (selectedPhoto?._id === photoId) setSelectedPhoto(data);
    } catch (err) { /* ignore */ }
  };

  const handleDoubleTap = useCallback((photoId) => {
    const now = Date.now();
    if (now - (lastTapRef.current[photoId] || 0) < 400) {
      handleLike(photoId);
      setShowHeart(photoId);
      setTimeout(() => setShowHeart(null), 800);
    }
    lastTapRef.current[photoId] = now;
  }, []);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !selectedPhoto) return;
    try {
      const { data } = await API.post(`/photos/comment/${selectedPhoto._id}`, { text: comment });
      setPhotos(prev => prev.map(p => p._id === data._id ? data : p));
      setSelectedPhoto(data);
      setComment('');
    } catch (err) { toast.error('Comment failed'); }
  };

  // Slideshow auto-advance
  useEffect(() => {
    if (!slideshow || photos.length === 0) return;
    const timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % photos.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slideshow, photos.length]);

  if (loading) return <LoadingSpinner size="lg" text="Loading photos..." />;

  const albums = ['All', ...new Set(photos.map(p => p.album || 'General').filter(Boolean))];
  const filteredPhotos = activeAlbum === 'All' ? photos : photos.filter(p => (p.album || 'General') === activeAlbum);
  const totalLikes = photos.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-pink via-accent-coral to-accent-orange" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-16 translate-y-16" />
        <div className="absolute top-0 right-20 w-32 h-32 bg-white/5 rounded-full -translate-y-10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <HiCamera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Photo Gallery</h1>
                  <p className="text-white/60 text-xs font-medium">Your visual stories</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {photos.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSlideshow(true); setSlideIndex(0); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-semibold rounded-xl transition-all border border-white/10"
                >
                  <HiPlayCircle className="w-4 h-4" /> Slideshow
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-accent-coral text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <HiPlus className="w-4 h-4" /> Upload
              </motion.button>
            </div>
          </div>

          {/* Stats Row */}
          {photos.length > 0 && (
            <div className="flex items-center gap-5 mt-5 pt-5 border-t border-white/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <HiPhoto className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{photos.length}</p>
                  <p className="text-white/50 text-[10px]">Photos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <HiHeart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{totalLikes}</p>
                  <p className="text-white/50 text-[10px]">Likes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <HiSparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{albums.length - 1}</p>
                  <p className="text-white/50 text-[10px]">Albums</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Album Filter Chips */}
      {albums.length > 2 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {albums.map(a => (
            <motion.button
              key={a}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveAlbum(a)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeAlbum === a
                  ? 'bg-accent-coral text-white shadow-md'
                  : 'bg-white/70 dark:bg-dark-card/70 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-100 dark:border-dark-border/40'
              }`}
            >
              {a}
            </motion.button>
          ))}
        </div>
      )}

      {/* Photo Feed – Instagram Card Style */}
      {filteredPhotos.length > 0 ? (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-2xl mx-auto">
          {filteredPhotos.map((photo) => (
            <motion.div
              key={photo._id}
              variants={item}
              className="glass-card overflow-hidden rounded-2xl"
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-accent-pink/30">
                  {photo.uploadedBy?.profilePhoto ? (
                    <img src={photo.uploadedBy.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full nebula-gradient flex items-center justify-center text-white text-xs font-bold">
                      {photo.uploadedBy?.name?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{photo.uploadedBy?.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {photo.album && <span>{photo.album} · </span>}{formatTimeAgo(photo.createdAt)}
                  </p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 transition-colors">
                  <HiEllipsisHorizontal className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Image — double tap to like */}
              <div
                className="relative cursor-pointer select-none bg-gray-100 dark:bg-dark-surface"
                onClick={() => handleDoubleTap(photo._id)}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.caption}
                  className="w-full object-cover max-h-[600px]"
                  draggable={false}
                />
                {/* Double-tap heart animation */}
                <AnimatePresence>
                  {showHeart === photo._id && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <HiHeart className="w-24 h-24 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="px-4 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 1.3 }}
                    onClick={() => handleLike(photo._id)}
                  >
                    <HiHeart className={`w-6 h-6 transition-colors ${
                      photo.likes?.includes(user?._id) ? 'text-accent-coral' : 'text-gray-600 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300'
                    }`} />
                  </motion.button>
                  <button onClick={() => setSelectedPhoto(photo)}>
                    <HiChatBubbleLeft className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300 transition-colors" />
                  </button>
                  <button>
                    <HiPaperAirplane className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300 transition-colors -rotate-12" />
                  </button>
                </div>
                <button>
                  <HiBookmark className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300 transition-colors" />
                </button>
              </div>

              {/* Likes & Caption */}
              <div className="px-4 pb-3.5 pt-1.5">
                {(photo.likes?.length || 0) > 0 && (
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    {photo.likes.length} {photo.likes.length === 1 ? 'like' : 'likes'}
                  </p>
                )}
                {photo.caption && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-bold text-gray-900 dark:text-white mr-1.5">{photo.uploadedBy?.name?.split(' ')[0]}</span>
                    {photo.caption}
                  </p>
                )}
                {(photo.comments?.length || 0) > 0 && (
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                  >
                    View all {photo.comments.length} comment{photo.comments.length > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-20">
          <div className="relative mx-auto w-28 h-28 mb-6">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-pink/20 to-accent-coral/20 dark:from-accent-pink/10 dark:to-accent-coral/10 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 rounded-2xl bg-white dark:bg-dark-card flex items-center justify-center shadow-soft">
              <HiCamera className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-gray-800 dark:text-gray-200 mb-1">Start Your Gallery</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs mx-auto">Upload photos to share moments with your friends</p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUpload(true)}
            className="btn-primary text-sm inline-flex items-center gap-2 px-6"
          >
            <HiArrowUpTray className="w-4 h-4" /> Upload Your First Photo
          </motion.button>
        </div>
      )}

      {/* Photo Detail / Comments Panel */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPhoto(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-5xl max-h-[90vh] flex flex-col lg:flex-row bg-white dark:bg-dark-card rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Close */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors"
              >
                <HiXMark className="w-5 h-5 text-white" />
              </motion.button>

              {/* Image Section */}
              <div className="lg:w-[60%] bg-black flex items-center justify-center min-h-[300px] lg:min-h-0 relative">
                <img src={selectedPhoto.imageUrl} alt="" className="max-w-full max-h-[85vh] object-contain" />
                <motion.button
                  whileTap={{ scale: 1.3 }}
                  onClick={() => handleLike(selectedPhoto._id)}
                  className="absolute bottom-4 left-4 p-2.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors"
                >
                  <HiHeart className={`w-6 h-6 ${selectedPhoto.likes?.includes(user?._id) ? 'text-accent-coral' : 'text-white/80 hover:text-white'}`} />
                </motion.button>
              </div>

              {/* Info Panel */}
              <div className="lg:w-[40%] flex flex-col max-h-[85vh]">
                {/* Author */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-dark-border/30 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-accent-pink/20">
                    {selectedPhoto.uploadedBy?.profilePhoto ? (
                      <img src={selectedPhoto.uploadedBy.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full nebula-gradient flex items-center justify-center text-white text-sm font-bold">
                        {selectedPhoto.uploadedBy?.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedPhoto.uploadedBy?.name}</span>
                    {selectedPhoto.album && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{selectedPhoto.album}</p>
                    )}
                  </div>
                </div>

                {/* Comments area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {/* Caption as first comment */}
                  {selectedPhoto.caption && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {selectedPhoto.uploadedBy?.profilePhoto ? (
                          <img src={selectedPhoto.uploadedBy.profilePhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full nebula-gradient flex items-center justify-center text-white text-[10px] font-bold">
                            {selectedPhoto.uploadedBy?.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          <span className="font-bold text-gray-900 dark:text-white mr-1.5">{selectedPhoto.uploadedBy?.name}</span>
                          <span className="text-gray-600 dark:text-gray-400">{selectedPhoto.caption}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatTimeAgo(selectedPhoto.createdAt)}</p>
                      </div>
                    </div>
                  )}

                  {selectedPhoto.comments?.length === 0 && !selectedPhoto.caption && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No comments yet. Start the conversation!</p>
                  )}

                  {selectedPhoto.comments?.map((c, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-hover flex-shrink-0 overflow-hidden">
                        {c.user?.profilePhoto ? (
                          <img src={c.user.profilePhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            {c.user?.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">
                          <span className="font-bold text-gray-900 dark:text-white mr-1.5">{c.user?.name}</span>
                          <span className="text-gray-600 dark:text-gray-400">{c.text}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions + Comment Input */}
                <div className="border-t border-gray-100 dark:border-dark-border/30 flex-shrink-0">
                  <div className="flex items-center justify-between px-4 pt-3">
                    <div className="flex items-center gap-3">
                      <motion.button whileTap={{ scale: 1.3 }} onClick={() => handleLike(selectedPhoto._id)}>
                        <HiHeart className={`w-6 h-6 transition-colors ${selectedPhoto.likes?.includes(user?._id) ? 'text-accent-coral' : 'text-gray-500 dark:text-gray-400 hover:text-accent-coral'}`} />
                      </motion.button>
                      <HiChatBubbleLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                      <HiPaperAirplane className="w-5 h-5 text-gray-500 dark:text-gray-400 -rotate-12" />
                    </div>
                    <HiBookmark className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="px-4 pt-1 pb-2 text-sm font-bold text-gray-900 dark:text-white">
                    {selectedPhoto.likes?.length || 0} {(selectedPhoto.likes?.length || 0) === 1 ? 'like' : 'likes'}
                  </p>
                  <form onSubmit={handleComment} className="flex items-center gap-2 px-4 pb-4">
                    <input
                      type="text" value={comment} onChange={e => setComment(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none py-2"
                      placeholder="Add a comment..."
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={!comment.trim()}
                      className="text-sm text-primary dark:text-primary-dark font-bold disabled:opacity-30 transition-opacity"
                    >
                      Post
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slideshow */}
      <AnimatePresence>
        {slideshow && photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSlideshow(false)}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm z-10 transition-colors"
            >
              <HiXMark className="w-6 h-6 text-white" />
            </motion.button>
            <button
              onClick={() => setSlideIndex(prev => (prev - 1 + photos.length) % photos.length)}
              className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors z-10"
            >
              <HiChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setSlideIndex(prev => (prev + 1) % photos.length)}
              className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors z-10"
            >
              <HiChevronRight className="w-6 h-6 text-white" />
            </button>
            <AnimatePresence mode="wait">
              <motion.img
                key={slideIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                src={photos[slideIndex]?.imageUrl}
                alt=""
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
              />
            </AnimatePresence>
            {photos[slideIndex]?.caption && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white text-sm px-6 py-2.5 rounded-full max-w-md truncate border border-white/10">
                {photos[slideIndex].caption}
              </div>
            )}
            <div className="absolute bottom-6 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === slideIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
            <div className="absolute top-5 left-5 text-white/50 text-sm font-medium tabular-nums">
              {slideIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Photo" size="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <FileDropzone onDrop={(files) => setFile(files[0])} accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }}
            label="Drop your photo here">
            {file && (
              <div className="flex flex-col items-center gap-3">
                <img src={URL.createObjectURL(file)} alt="" className="max-w-full max-h-48 object-contain rounded-2xl shadow-md" />
                <p className="text-sm text-primary dark:text-primary-dark font-medium">{file.name}</p>
              </div>
            )}
          </FileDropzone>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Caption</label>
            <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
              className="input-field w-full" placeholder="Write a caption..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">Album</label>
            <input type="text" value={album} onChange={e => setAlbum(e.target.value)}
              className="input-field w-full" placeholder="Album name" />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit" disabled={uploading}
            className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? 'Uploading...' : <><HiArrowUpTray className="w-4 h-4" /> Share Photo</>}
          </motion.button>
        </form>
      </Modal>
    </motion.div>
  );
};

export default Photos;
