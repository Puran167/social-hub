import React, { useState } from 'react';
import { HiBars3, HiMagnifyingGlass, HiHeart, HiSun, HiMoon } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ onMenuToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-dark-border/60 transition-colors">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 transition-all">
            <HiBars3 className="w-6 h-6 text-gray-800 dark:text-gray-100" />
          </button>
          <h1 className="lg:hidden text-lg font-extrabold gradient-text">Social Hub</h1>
        </div>

        <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-xs mx-auto">
          <div className={`flex items-center w-full bg-gray-100/80 dark:bg-dark-hover/80 rounded-xl px-3.5 py-2 transition-all ${searchFocused ? 'ring-2 ring-primary/30 dark:ring-primary-dark/30' : ''}`}>
            <HiMagnifyingGlass className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search..."
              className="bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none flex-1"
            />
          </div>
        </form>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 transition-all"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            <AnimatePresence mode="wait">
              {darkMode ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <HiSun className="w-5 h-5 text-accent-orange" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <HiMoon className="w-5 h-5 text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/notifications')}
            className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 transition-all relative"
          >
            <HiHeart className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-accent-coral rounded-full text-[10px] text-white flex items-center justify-center font-bold shadow-sm"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>

          <motion.div
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-primary/30 dark:hover:ring-primary-dark/30 transition-all"
            onClick={() => navigate('/profile')}
          >
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full nebula-gradient flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
