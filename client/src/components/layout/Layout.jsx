import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MusicPlayer from '../music/MusicPlayer';
import { useMusic } from '../../context/MusicContext';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentSong } = useMusic();

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="xl:ml-60 lg:ml-[72px] flex flex-col min-h-screen pb-16 lg:pb-0">
        <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main className={`flex-1 overflow-auto transition-all duration-300 ${currentSong ? 'pb-24' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl mx-auto px-4 py-5 lg:px-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {currentSong && <MusicPlayer />}
    </div>
  );
};

export default Layout;
