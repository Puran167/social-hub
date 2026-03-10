import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiHome, HiMusicalNote, HiPhoto, HiVideoCamera,
  HiChatBubbleLeftRight, HiPhone, HiUserGroup, HiCog6Tooth,
  HiSparkles, HiFilm, HiBookOpen, HiMagnifyingGlass,
  HiHeart, HiPlusCircle, HiUser, HiSignal, HiNewspaper
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';

const mainLinks = [
  { to: '/', icon: HiHome, label: 'Home' },
  { to: '/feed', icon: HiNewspaper, label: 'Feed' },
  { to: '/music', icon: HiMusicalNote, label: 'Music' },
  { to: '/photos', icon: HiPhoto, label: 'Photos' },
  { to: '/stories', icon: HiBookOpen, label: 'Stories' },
  { to: '/reels', icon: HiFilm, label: 'Reels' },
  { to: '/videos', icon: HiVideoCamera, label: 'Videos' },
  { to: '/chat', icon: HiChatBubbleLeftRight, label: 'Messages' },
  { to: '/video-call', icon: HiPhone, label: 'Calls' },
  { to: '/friends', icon: HiUserGroup, label: 'Friends' },
  { to: '/watch-party', icon: HiSignal, label: 'Watch Party' },
  { to: '/notifications', icon: HiHeart, label: 'Notifications' },
];

const bottomLinks = [
  { to: '/settings', icon: HiCog6Tooth, label: 'Settings' },
];

const mobileLinks = [
  { to: '/', icon: HiHome, label: 'Home' },
  { to: '/music', icon: HiMusicalNote, label: 'Music' },
  { to: '/reels', icon: HiFilm, label: 'Reels' },
  { to: '/chat', icon: HiChatBubbleLeftRight, label: 'Chat' },
  { to: '/profile', icon: HiUser, label: 'Profile' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full
        bg-white/90 dark:bg-dark-surface/90 backdrop-blur-2xl
        border-r border-gray-200/60 dark:border-dark-border/60
        flex flex-col transition-all duration-300
        xl:w-60 lg:w-[72px] lg:translate-x-0
        w-60
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 xl:px-5 lg:px-0 lg:flex lg:justify-center xl:justify-start h-16 flex items-center border-b border-gray-200/60 dark:border-dark-border/60">
          <div className="xl:block lg:hidden block">
            <h1 className="text-xl font-extrabold gradient-text tracking-tight">Social Hub</h1>
          </div>
          <div className="hidden lg:block xl:hidden">
            <div className="w-9 h-9 rounded-xl nebula-gradient flex items-center justify-center shadow-glow-sm">
              <span className="text-sm font-extrabold text-white">S</span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-hide">
          {mainLinks.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={`
                  flex items-center gap-4 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group relative
                  xl:justify-start lg:justify-center xl:px-3
                  ${isActive
                    ? 'bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary-dark font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80'}
                `}
              >
                <Icon className={`w-6 h-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary dark:text-primary-dark' : ''}`} />
                <span className="xl:block lg:hidden block text-sm">{label}</span>
                <div className="hidden lg:block xl:hidden absolute left-full ml-3 px-3 py-1.5 bg-dark-bg dark:bg-white text-white dark:text-dark-bg text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {label}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="py-2 px-2 border-t border-gray-200/60 dark:border-dark-border/60">
          {bottomLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group xl:justify-start lg:justify-center
                ${isActive ? 'bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary-dark font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80'}`
              }
            >
              <Icon className="w-6 h-6 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="xl:block lg:hidden block text-sm">{label}</span>
            </NavLink>
          ))}

          {user && (
            <NavLink
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 transition-all xl:justify-start lg:justify-center mt-1"
            >
              <div className="w-8 h-8 rounded-full nebula-gradient p-[2px] flex-shrink-0 shadow-glow-sm">
                <div className="w-full h-full rounded-full bg-white dark:bg-dark-surface overflow-hidden">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      {user.name?.[0]}
                    </div>
                  )}
                </div>
              </div>
              <div className="xl:block lg:hidden block min-w-0">
                <p className="text-sm font-semibold truncate text-gray-800 dark:text-gray-100">{user.name}</p>
              </div>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-2xl border-t border-gray-200/60 dark:border-dark-border/60 lg:hidden pb-safe">
        <div className="flex items-center justify-around px-2 py-1">
          {mobileLinks.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center py-2 px-3"
              >
                {to === '/profile' && user ? (
                  <div className={`w-7 h-7 rounded-full overflow-hidden ${isActive ? 'ring-2 ring-primary dark:ring-primary-dark' : ''}`}>
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-dark-hover flex items-center justify-center text-xs font-bold">
                        {user.name?.[0]}
                      </div>
                    )}
                  </div>
                ) : (
                  <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-primary dark:text-primary-dark' : 'text-gray-400 dark:text-gray-500'}`} />
                )}
                <span className={`text-[10px] mt-0.5 ${isActive ? 'text-primary dark:text-primary-dark font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
