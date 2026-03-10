import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const MusicContext = createContext(null);
export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off, one, all
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioRef] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);

  const currentSong = queue[currentIndex] || null;

  useEffect(() => {
    if (!audioRef) return;
    audioRef.volume = volume;
  }, [volume, audioRef]);

  useEffect(() => {
    if (!audioRef || !currentSong) return;
    audioRef.src = currentSong.audioUrl;
    if (isPlaying) audioRef.play().catch(() => {});
    const timeUpdate = () => setCurrentTime(audioRef.currentTime);
    const loaded = () => setDuration(audioRef.duration);
    const ended = () => {
      if (repeat === 'one') { audioRef.currentTime = 0; audioRef.play(); }
      else playNext();
    };
    audioRef.addEventListener('timeupdate', timeUpdate);
    audioRef.addEventListener('loadedmetadata', loaded);
    audioRef.addEventListener('ended', ended);
    return () => {
      audioRef.removeEventListener('timeupdate', timeUpdate);
      audioRef.removeEventListener('loadedmetadata', loaded);
      audioRef.removeEventListener('ended', ended);
    };
  }, [currentSong?.audioUrl, currentIndex]);

  const play = useCallback(() => { if (audioRef) { audioRef.play().catch(() => {}); setIsPlaying(true); } }, [audioRef]);
  const pause = useCallback(() => { if (audioRef) { audioRef.pause(); setIsPlaying(false); } }, [audioRef]);
  const togglePlay = useCallback(() => { isPlaying ? pause() : play(); }, [isPlaying, play, pause]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffle) {
      const next = Math.floor(Math.random() * queue.length);
      setCurrentIndex(next);
    } else if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (repeat === 'all') {
      setCurrentIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [queue.length, currentIndex, shuffle, repeat]);

  const playPrev = useCallback(() => {
    if (audioRef && audioRef.currentTime > 3) { audioRef.currentTime = 0; return; }
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    else if (repeat === 'all') setCurrentIndex(queue.length - 1);
  }, [currentIndex, queue.length, repeat, audioRef]);

  const playSong = useCallback((song, songList) => {
    if (songList) {
      setQueue(songList);
      const idx = songList.findIndex(s => s._id === song._id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue([song]);
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, []);

  const seek = useCallback((time) => { if (audioRef) audioRef.currentTime = time; }, [audioRef]);
  const toggleShuffle = useCallback(() => setShuffle(prev => !prev), []);
  const toggleRepeat = useCallback(() => {
    setRepeat(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  }, []);

  return (
    <MusicContext.Provider value={{
      queue, currentSong, currentIndex, isPlaying, shuffle, repeat, volume, currentTime, duration,
      play, pause, togglePlay, playNext, playPrev, playSong, seek, setVolume, toggleShuffle, toggleRepeat, setQueue, setCurrentIndex,
    }}>
      {children}
    </MusicContext.Provider>
  );
};
