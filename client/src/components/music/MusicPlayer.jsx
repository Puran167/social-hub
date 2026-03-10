import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlay, HiPause, HiForward, HiBackward, HiSpeakerWave, HiSpeakerXMark, HiHeart, HiMusicalNote } from 'react-icons/hi2';
import { TbArrowsShuffle, TbRepeat, TbRepeatOnce } from 'react-icons/tb';
import { useMusic } from '../../context/MusicContext';

const formatTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const MusicPlayer = () => {
  const {
    currentSong, isPlaying, shuffle, repeat, volume, currentTime, duration,
    togglePlay, playNext, playPrev, seek, setVolume, toggleShuffle, toggleRepeat,
  } = useMusic();

  if (!currentSong) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-40 xl:ml-60 lg:ml-[72px] mb-16 lg:mb-0"
      >
        {/* Progress bar on top edge */}
        <div className="h-[2px] bg-gray-200/50 dark:bg-dark-border/30 relative">
          <div className="h-full bg-gradient-to-r from-primary via-accent-pink to-accent-coral transition-all duration-200 ease-linear"
            style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-2xl border-t border-gray-200/40 dark:border-dark-border/30">
          <div className="flex items-center justify-between px-4 py-2 max-w-screen-2xl mx-auto gap-4">
            {/* Song info */}
            <div className="flex items-center gap-3 w-1/4 min-w-0">
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${isPlaying ? 'shadow-glow-sm' : ''}`}>
                  {currentSong.coverArt ? (
                    <img src={currentSong.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent-pink/20 dark:from-primary/30 dark:to-accent-pink/30 flex items-center justify-center">
                      <HiMusicalNote className="w-5 h-5 text-primary dark:text-primary-dark" />
                    </div>
                  )}
                </div>
                {isPlaying && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{currentSong.title}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{currentSong.artist || 'Unknown Artist'}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-1.5">
                <button onClick={toggleShuffle} className={`p-1 transition-all ${shuffle ? 'text-primary dark:text-primary-dark' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}>
                  <TbArrowsShuffle className="w-4 h-4" />
                </button>
                <button onClick={playPrev} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all p-1">
                  <HiBackward className="w-5 h-5" />
                </button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={togglePlay}
                  className="w-10 h-10 nebula-gradient rounded-full flex items-center justify-center shadow-glow-sm hover:shadow-glow transition-shadow">
                  {isPlaying ? <HiPause className="w-5 h-5 text-white" /> : <HiPlay className="w-5 h-5 text-white ml-0.5" />}
                </motion.button>
                <button onClick={playNext} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all p-1">
                  <HiForward className="w-5 h-5" />
                </button>
                <button onClick={toggleRepeat}
                  className={`p-1 transition-all ${repeat !== 'off' ? 'text-primary dark:text-primary-dark' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}>
                  {repeat === 'one' ? <TbRepeatOnce className="w-4 h-4" /> : <TbRepeat className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                <input type="range" min={0} max={duration || 100} value={currentTime}
                  onChange={e => seek(parseFloat(e.target.value))}
                  className="flex-1 h-1" />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10 tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 w-1/4 justify-end">
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.7)} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all">
                {volume === 0 ? <HiSpeakerXMark className="w-4 h-4" /> : <HiSpeakerWave className="w-4 h-4" />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-24 h-1" />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MusicPlayer;
