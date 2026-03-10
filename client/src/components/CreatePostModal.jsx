import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiXMark, HiPhoto, HiVideoCamera, HiMusicalNote, HiXCircle,
  HiPlay, HiPause, HiMagnifyingGlass, HiLink, HiArrowUpTray,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';

const CreatePostModal = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const [musicTab, setMusicTab] = useState('library'); // library | upload | url
  const [mySongs, setMySongs] = useState([]);
  const [songSearch, setSongSearch] = useState('');
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const imageInputRef = useRef();
  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const previewAudioRef = useRef();

  // Fetch user's song library
  useEffect(() => {
    if (showMusicPanel && musicTab === 'library' && mySongs.length === 0) {
      setLoadingSongs(true);
      API.get('/songs?limit=50').then(res => {
        setMySongs(res.data.songs || res.data || []);
      }).catch(() => {}).finally(() => setLoadingSongs(false));
    }
  }, [showMusicPanel, musicTab]);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setVideo(null);
    setVideoPreview(null);
  };

  const handleVideo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setImage(null);
    setImagePreview(null);
  };

  const handleAudioFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
    setSongTitle(file.name.replace(/\.[^.]+$/, ''));
    setSongUrl('');
    setShowMusicPanel(false);
  };

  const pickSong = (song) => {
    setSongUrl(song.audioUrl || song.url || '');
    setSongTitle(song.title || song.name || '');
    setAudioFile(null);
    setAudioPreview(song.audioUrl || song.url || '');
    setShowMusicPanel(false);
  };

  const setUrlSong = () => {
    if (!songUrl.trim()) return;
    setAudioFile(null);
    setAudioPreview(songUrl.trim());
    setShowMusicPanel(false);
  };

  const removeMusic = () => {
    setAudioFile(null); setSongUrl(''); setSongTitle('');
    setAudioPreview(null); setPreviewPlaying(false);
    if (previewAudioRef.current) previewAudioRef.current.pause();
  };

  const removeMedia = () => {
    setImage(null); setImagePreview(null);
    setVideo(null); setVideoPreview(null);
  };

  const togglePreview = () => {
    if (!previewAudioRef.current) return;
    if (previewPlaying) previewAudioRef.current.pause();
    else previewAudioRef.current.play();
    setPreviewPlaying(!previewPlaying);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image && !video && !audioFile && !songUrl) {
      toast.error('Add some content to your post');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (text.trim()) fd.append('text', text.trim());
      if (image) fd.append('image', image);
      if (video) fd.append('video', video);
      if (audioFile) fd.append('audio', audioFile);
      else if (songUrl.trim()) fd.append('songUrl', songUrl.trim());
      if (songTitle.trim()) fd.append('songTitle', songTitle.trim());

      const { data } = await API.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Post created!');
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = text.trim() || image || video || audioFile || songUrl.trim();
  const filteredSongs = mySongs.filter(s =>
    (s.title || s.name || '').toLowerCase().includes(songSearch.toLowerCase()) ||
    (s.artist || '').toLowerCase().includes(songSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white dark:bg-dark-card rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/60 dark:border-dark-border/60">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Create Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl transition-colors">
            <HiXMark className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* User */}
          <div className="flex items-center gap-3 px-5 pt-4">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full nebula-gradient flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]}
              </div>
            )}
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{user?.name}</p>
          </div>

          {/* Text Area */}
          <div className="px-5 py-3">
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none outline-none"
            />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mx-5 mb-3 rounded-2xl overflow-hidden">
              <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover rounded-2xl" />
              <button onClick={removeMedia} type="button"
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                <HiXCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Video Preview */}
          {videoPreview && (
            <div className="relative mx-5 mb-3 rounded-2xl overflow-hidden bg-black">
              <video src={videoPreview} controls className="w-full max-h-64 object-contain rounded-2xl" />
              <button onClick={removeMedia} type="button"
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                <HiXCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Audio Preview */}
          {audioPreview && (
            <div className="mx-5 mb-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-accent-pink/10 to-accent-coral/10 dark:from-primary/15 dark:via-accent-pink/15 dark:to-accent-coral/15 border border-primary/10">
              <audio ref={previewAudioRef} src={audioPreview} onEnded={() => setPreviewPlaying(false)} />
              <div className="flex items-center gap-3">
                <button type="button" onClick={togglePreview}
                  className="w-9 h-9 rounded-full nebula-gradient flex items-center justify-center shadow-glow-sm flex-shrink-0">
                  {previewPlaying ? <HiPause className="w-4 h-4 text-white" /> : <HiPlay className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate flex items-center gap-1.5">
                    <HiMusicalNote className="w-4 h-4 text-primary flex-shrink-0" />
                    {songTitle || 'Attached Song'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{audioFile ? 'Uploaded file' : 'From library'}</p>
                </div>
                <button type="button" onClick={removeMusic}
                  className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
                  <HiXCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Music Selection Panel */}
          <AnimatePresence>
            {showMusicPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mx-5 mb-3 rounded-2xl bg-gray-50 dark:bg-dark-elevated border border-gray-200/60 dark:border-dark-border/60 overflow-hidden"
              >
                {/* Tabs */}
                <div className="flex border-b border-gray-200/60 dark:border-dark-border/60">
                  {[
                    { key: 'library', label: 'My Library', icon: HiMusicalNote },
                    { key: 'upload', label: 'Upload', icon: HiArrowUpTray },
                    { key: 'url', label: 'Paste URL', icon: HiLink },
                  ].map(tab => (
                    <button key={tab.key} type="button" onClick={() => setMusicTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                        musicTab === tab.key
                          ? 'text-primary dark:text-primary-dark border-b-2 border-primary'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}>
                      <tab.icon className="w-3.5 h-3.5" />{tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-3">
                  {/* Library Tab */}
                  {musicTab === 'library' && (
                    <div>
                      <div className="relative mb-2">
                        <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text" value={songSearch} onChange={e => setSongSearch(e.target.value)}
                          placeholder="Search your songs..."
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border outline-none text-gray-800 dark:text-gray-100"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {loadingSongs && <p className="text-xs text-gray-400 text-center py-4">Loading songs...</p>}
                        {!loadingSongs && filteredSongs.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">No songs found</p>
                        )}
                        {filteredSongs.map(song => (
                          <button key={song._id} type="button" onClick={() => pickSong(song)}
                            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-dark-card transition-colors text-left">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent-pink/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {song.coverArt ? (
                                <img src={song.coverArt} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <HiMusicalNote className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-100">{song.title || song.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{song.artist || 'Unknown'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Tab */}
                  {musicTab === 'upload' && (
                    <div className="text-center py-4">
                      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFile} />
                      <button type="button" onClick={() => audioInputRef.current?.click()}
                        className="px-5 py-2.5 nebula-gradient text-white rounded-2xl text-sm font-semibold shadow-glow-sm hover:shadow-glow transition-shadow">
                        <HiArrowUpTray className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                        Choose Audio File
                      </button>
                      <p className="text-[10px] text-gray-400 mt-2">MP3, WAV, OGG, AAC, M4A — up to 100MB</p>
                    </div>
                  )}

                  {/* URL Tab */}
                  {musicTab === 'url' && (
                    <div className="space-y-2">
                      <input type="url" value={songUrl} onChange={e => setSongUrl(e.target.value)}
                        placeholder="Paste audio URL..."
                        className="w-full text-sm px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input type="text" value={songTitle} onChange={e => setSongTitle(e.target.value)}
                        placeholder="Song title (optional)"
                        className="w-full text-sm px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button type="button" onClick={setUrlSong} disabled={!songUrl.trim()}
                        className="w-full py-2 bg-primary/10 text-primary dark:text-primary-dark rounded-xl text-sm font-semibold disabled:opacity-30 hover:bg-primary/20 transition-colors">
                        Attach
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100/60 dark:border-dark-border/30">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-auto">Add to post</p>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />
            <button type="button" onClick={() => imageInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl transition-colors" title="Photo">
              <HiPhoto className="w-5 h-5 text-accent-teal" />
            </button>
            <button type="button" onClick={() => videoInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl transition-colors" title="Video">
              <HiVideoCamera className="w-5 h-5 text-accent-coral" />
            </button>
            <button type="button" onClick={() => setShowMusicPanel(!showMusicPanel)}
              className={`p-2 rounded-xl transition-colors ${showMusicPanel ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-dark-hover'}`} title="Music">
              <HiMusicalNote className="w-5 h-5 text-primary dark:text-primary-dark" />
            </button>
          </div>

          {/* Submit */}
          <div className="px-5 pb-5">
            <button
              type="submit"
              disabled={!hasContent || submitting}
              className="w-full py-3 nebula-gradient text-white rounded-2xl font-semibold text-sm shadow-glow-sm hover:shadow-glow transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreatePostModal;
