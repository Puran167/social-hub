import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiBell, HiHeart, HiChatBubbleLeft, HiUserPlus, HiMusicalNote, HiEye
} from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';

const typeIconMap = {
  friend_request: HiUserPlus,
  friend_accepted: HiUserPlus,
  song_like: HiHeart,
  photo_like: HiHeart,
  reel_like: HiHeart,
  post_like: HiHeart,
  post_comment: HiChatBubbleLeft,
  comment: HiChatBubbleLeft,
  message: HiChatBubbleLeft,
  playlist_invite: HiMusicalNote,
  story_view: HiEye,
};

const typeColorMap = {
  friend_request: 'bg-primary/20 text-primary',
  friend_accepted: 'bg-accent-teal/20 text-accent-teal',
  song_like: 'bg-accent-coral/20 text-accent-coral',
  photo_like: 'bg-accent-coral/20 text-accent-coral',
  reel_like: 'bg-accent-coral/20 text-accent-coral',
  post_like: 'bg-accent-coral/20 text-accent-coral',
  post_comment: 'bg-accent-blue/20 text-accent-blue',
  comment: 'bg-accent-blue/20 text-accent-blue',
  message: 'bg-primary/20 text-primary',
  playlist_invite: 'bg-accent-pink/20 text-accent-pink',
  story_view: 'bg-accent-pink/20 text-accent-pink',
};

const NotificationToast = ({ toasts, removeToast }) => {
  const navigate = useNavigate();

  const handleClick = (toast) => {
    removeToast(toast._id);
    navigate('/notifications');
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast._id} toast={toast} onClose={removeToast} onClick={handleClick} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem = ({ toast, onClose, onClick }) => {
  const Icon = typeIconMap[toast.type] || HiBell;
  const colors = typeColorMap[toast.type] || 'bg-gray-200 text-gray-600';

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast._id), 4000);
    return () => clearTimeout(timer);
  }, [toast._id, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onClick(toast)}
      className="pointer-events-auto cursor-pointer glass-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl hover:shadow-2xl transition-shadow"
    >
      {/* Avatar or Icon */}
      <div className="relative flex-shrink-0">
        {toast.sender?.profilePhoto ? (
          <img src={toast.sender.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        {toast.sender?.profilePhoto && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-bg ${colors}`}>
            <Icon className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          {toast.sender?.name && <span className="font-semibold">{toast.sender.name} </span>}
          <span className="text-gray-600 dark:text-gray-300">
            {toast.content?.replace(toast.sender?.name, '').trim()}
          </span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">just now</p>
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(toast._id); }}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
};

export default NotificationToast;
