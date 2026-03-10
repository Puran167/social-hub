import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMusicalNote, HiPlay, HiHeart, HiPlus, HiMagnifyingGlass, HiPause, HiEllipsisHorizontal } from 'react-icons/hi2';
import API from '../services/api';
import { useMusic } from '../context/MusicContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import FileDropzone from '../components/ui/FileDropzone';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1] } } };

const Music = () => {
  const { user } = useAuth();
  const { playSong, currentSong, isPlaying } = useMusic();
  const [songs, setSongs] = useState([]);
  const [mySongs, setMySongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [tab, setTab] = useState('browse');
  const [uploadForm, setUploadForm] = useState({ title: '', artist: '', album: '', genre: '' });
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [songsRes, myRes, playlistRes] = await Promise.all([
        API.get('/songs'), API.get('/songs/my'), API.get('/playlists'),
      ]);
      setSongs(songsRes.data.songs || []);
      setMySongs(myRes.data || []);
      setPlaylists(playlistRes.data || []);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile) return toast.error('Select an audio file');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('audio', audioFile);
      // Auto-fill title from filename if empty
      const autoTitle = uploadForm.title.trim() || audioFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      form.append('title', autoTitle);
      if (uploadForm.artist) form.append('artist', uploadForm.artist);
      if (uploadForm.album) form.append('album', uploadForm.album);
      if (uploadForm.genre) form.append('genre', uploadForm.genre);
      const { data } = await API.post('/songs', form);
      setSongs(prev => [data, ...prev]);
      setMySongs(prev => [data, ...prev]);
      setShowUpload(false);
      setUploadForm({ title: '', artist: '', album: '', genre: '' });
      setAudioFile(null);
      toast.success('Song uploaded!');
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    setUploading(false);
  };

  const handleLike = async (songId) => {
    try {
      const { data } = await API.put(`/songs/like/${songId}`);
      setSongs(prev => prev.map(s => s._id === songId ? data : s));
    } catch (err) { /* ignore */ }
  };

  const handleFavorite = async (songId) => {
    try {
      await API.put(`/songs/favorite/${songId}`);
      toast.success('Favorites updated');
    } catch (err) { /* ignore */ }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const { data } = await API.post('/playlists', { name: newPlaylistName });
      setPlaylists(prev => [...prev, data]);
      setNewPlaylistName('');
      setShowPlaylistModal(false);
      toast.success('Playlist created!');
    } catch (err) { toast.error('Failed to create playlist'); }
  };

  const filteredSongs = search ? songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist?.toLowerCase().includes(search.toLowerCase())
  ) : songs;

  if (loading) return <LoadingSpinner size="lg" text="Loading music..." />;

  const isCurrentlyPlaying = (songId) => currentSong?._id === songId && isPlaying;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero Header */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-purple-600/80 to-accent-pink/70 p-6 lg:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-1">Music Library</h1>
              <p className="text-white/70 text-sm">{songs.length} songs · {playlists.length} playlists</p>
            </div>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowUpload(true)} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 border border-white/10">
                <HiPlus className="w-4 h-4" /> Upload Song
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowPlaylistModal(true)} className="bg-white text-primary font-semibold text-sm py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-black/10">
                <HiPlus className="w-4 h-4" /> New Playlist
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-5 max-w-md">
            <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10 focus-within:bg-white/20 transition-all">
              <HiMagnifyingGlass className="w-4 h-4 text-white/60 mr-2" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search songs, artists..." className="bg-transparent text-sm text-white placeholder-white/50 outline-none flex-1" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-1 bg-gray-100/80 dark:bg-dark-hover/50 rounded-xl p-1 w-fit">
        {['browse', 'my-songs', 'playlists'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t
              ? 'bg-white dark:bg-dark-card text-primary dark:text-primary-dark shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}>
            {t === 'browse' ? 'Browse' : t === 'my-songs' ? 'My Songs' : 'Playlists'}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'browse' && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-[32px_1fr_1fr_80px_60px] gap-4 px-4 py-2 text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
              <span>#</span><span>Title</span><span>Album</span><span>Plays</span><span></span>
            </div>
            {filteredSongs.map((song, i) => {
              const playing = isCurrentlyPlaying(song._id);
              return (
                <motion.div key={song._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className={`grid grid-cols-[32px_1fr_80px_48px] sm:grid-cols-[32px_1fr_1fr_80px_48px] gap-4 px-4 py-2.5 rounded-xl group items-center cursor-pointer transition-all duration-200 ${
                    playing ? 'bg-primary/8 dark:bg-primary/10' : 'hover:bg-gray-50/80 dark:hover:bg-dark-hover/40'
                  }`}
                  onClick={() => playSong(song, filteredSongs)}>
                  {/* Track number / play icon */}
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <span className={`text-sm group-hover:hidden ${playing ? 'text-primary dark:text-primary-dark font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                      {playing ? '♫' : i + 1}
                    </span>
                    <HiPlay className="w-4 h-4 text-primary dark:text-primary-dark hidden group-hover:block" />
                  </div>
                  {/* Song info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden ${playing ? 'ring-2 ring-primary/40 shadow-glow-sm' : ''}`}>
                      {song.coverArt ? (
                        <img src={song.coverArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/25 dark:to-accent-pink/25 flex items-center justify-center">
                          <HiMusicalNote className={`w-4 h-4 ${playing ? 'text-primary dark:text-primary-dark' : 'text-gray-400 dark:text-gray-500'}`} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${playing ? 'text-primary dark:text-primary-dark' : 'text-gray-900 dark:text-white'}`}>{song.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{song.artist || 'Unknown Artist'}</p>
                    </div>
                  </div>
                  {/* Album */}
                  <span className="hidden sm:block text-sm text-gray-400 dark:text-gray-500 truncate">{song.album || '—'}</span>
                  {/* Plays */}
                  <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">{song.plays || 0}</span>
                  {/* Like */}
                  <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); handleLike(song._id); }}
                    className={`p-1.5 rounded-full transition-all ${song.likes?.includes(user?._id)
                      ? 'text-accent-coral'
                      : 'text-gray-300 dark:text-gray-600 hover:text-accent-coral opacity-0 group-hover:opacity-100'
                    }`}>
                    <HiHeart className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              );
            })}
            {filteredSongs.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center mx-auto mb-4">
                  <HiMusicalNote className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 font-medium">No songs found</p>
                <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">Try a different search or upload something</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'my-songs' && (
          <motion.div key="my-songs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
            {mySongs.map((song, i) => {
              const playing = isCurrentlyPlaying(song._id);
              return (
                <motion.div key={song._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 px-4 py-2.5 rounded-xl group cursor-pointer transition-all duration-200 ${
                    playing ? 'bg-primary/8 dark:bg-primary/10' : 'hover:bg-gray-50/80 dark:hover:bg-dark-hover/40'
                  }`}
                  onClick={() => playSong(song, mySongs)}>
                  <span className={`text-sm w-6 text-center ${playing ? 'text-primary dark:text-primary-dark font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                    {playing ? '♫' : i + 1}
                  </span>
                  <div className={`w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden ${playing ? 'ring-2 ring-primary/40' : ''}`}>
                    {song.coverArt ? <img src={song.coverArt} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/25 dark:to-accent-pink/25 flex items-center justify-center">
                        <HiMusicalNote className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${playing ? 'text-primary dark:text-primary-dark' : ''}`}>{song.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{song.artist || 'Unknown Artist'}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{song.plays} plays</span>
                </motion.div>
              );
            })}
            {mySongs.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center mx-auto mb-4">
                  <HiMusicalNote className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 font-medium">You haven't uploaded any songs yet</p>
                <button onClick={() => setShowUpload(true)} className="text-sm text-primary dark:text-primary-dark font-semibold mt-2 hover:underline">Upload your first song</button>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'playlists' && (
          <motion.div key="playlists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((pl, i) => (
              <motion.div key={pl._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="group cursor-pointer">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-accent-pink/10 to-accent-coral/10 dark:from-primary/30 dark:via-accent-pink/15 dark:to-accent-coral/10 mb-3 flex items-center justify-center overflow-hidden relative shadow-soft group-hover:shadow-lg transition-all">
                  {pl.coverImage ? <img src={pl.coverImage} alt="" className="w-full h-full object-cover" /> : (
                    <HiMusicalNote className="w-10 h-10 text-primary/40 dark:text-primary-dark/40" />
                  )}
                  <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg shadow-primary/30">
                    <HiPlay className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
                <p className="text-sm font-semibold truncate">{pl.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{pl.songs?.length || 0} songs</p>
                {pl.isCollaborative && <span className="text-[10px] text-primary dark:text-primary-dark font-semibold uppercase tracking-wider">Collaborative</span>}
              </motion.div>
            ))}
            {playlists.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center mx-auto mb-4">
                  <HiMusicalNote className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 font-medium">No playlists yet</p>
                <button onClick={() => setShowPlaylistModal(true)} className="text-sm text-primary dark:text-primary-dark font-semibold mt-2 hover:underline">Create your first playlist</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Song" size="md">
        <form onSubmit={handleUpload} className="space-y-5">
          <FileDropzone onDrop={(files) => setAudioFile(files[0])} accept={{ 'audio/*': ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.wma'] }}
            label="Drop your audio file here">
            {audioFile && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <HiMusicalNote className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-primary dark:text-primary-dark truncate">{audioFile.name}</p>
                  <p className="text-xs text-gray-400">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </div>
            )}
          </FileDropzone>

          {audioFile && (
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2 text-center">
              All fields below are optional — title auto-fills from filename
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title <span className="text-gray-300 dark:text-gray-600">(optional)</span></label>
            <input type="text" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
              className="input-field w-full" placeholder={audioFile ? audioFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Song title'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Artist <span className="text-gray-300 dark:text-gray-600">(optional)</span></label>
            <input type="text" value={uploadForm.artist} onChange={e => setUploadForm({ ...uploadForm, artist: e.target.value })}
              className="input-field w-full" placeholder="Artist name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Album</label>
              <input type="text" value={uploadForm.album} onChange={e => setUploadForm({ ...uploadForm, album: e.target.value })}
                className="input-field w-full" placeholder="Album" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Genre</label>
              <input type="text" value={uploadForm.genre} onChange={e => setUploadForm({ ...uploadForm, genre: e.target.value })}
                className="input-field w-full" placeholder="Genre" />
            </div>
          </div>
          <button type="submit" disabled={uploading || !audioFile} className="btn-primary w-full disabled:opacity-50">
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </span>
            ) : 'Upload Song'}
          </button>
        </form>
      </Modal>

      {/* Playlist Modal */}
      <Modal isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} title="New Playlist" size="sm">
        <div className="space-y-4">
          <input type="text" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}
            className="input-field w-full" placeholder="Playlist name" />
          <button onClick={createPlaylist} className="btn-primary w-full">Create Playlist</button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default Music;
