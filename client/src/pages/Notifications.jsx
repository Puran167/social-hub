import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiBell, HiHeart, HiChatBubbleLeft, HiUserPlus, HiMusicalNote, HiVideoCamera,
  HiPhoto, HiCheck, HiEye
} from 'react-icons/hi2';
import { useNotifications } from '../context/NotificationContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const iconMap = {
  song_like: HiHeart,
  photo_like: HiHeart,
  reel_like: HiHeart,
  post_like: HiHeart,
  post_comment: HiChatBubbleLeft,
  comment: HiChatBubbleLeft,
  friend_request: HiUserPlus,
  friend_accepted: HiUserPlus,
  message: HiChatBubbleLeft,
  playlist_invite: HiMusicalNote,
  story_view: HiEye,
  call: HiVideoCamera,
  system: HiBell,
};

const colorMap = {
  song_like: 'text-accent-coral bg-accent-coral/10',
  photo_like: 'text-accent-coral bg-accent-coral/10',
  reel_like: 'text-accent-coral bg-accent-coral/10',
  post_like: 'text-accent-coral bg-accent-coral/10',
  post_comment: 'text-accent-blue bg-accent-blue/10',
  comment: 'text-accent-blue bg-accent-blue/10',
  friend_request: 'text-primary bg-primary/10',
  friend_accepted: 'text-accent-teal bg-accent-teal/10',
  message: 'text-primary bg-primary/10',
  playlist_invite: 'text-accent-pink bg-accent-pink/10',
  story_view: 'text-accent-pink bg-accent-pink/10',
  call: 'text-accent-teal bg-accent-teal/10',
  system: 'text-gray-500 bg-gray-100 dark:bg-dark-hover',
};

const Notifications = () => {
  const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => { fetchNotifications(); }, []);

  const formatTime = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading notifications..." />;

  // Group notifications: today, this week, earlier
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const today = notifications.filter(n => new Date(n.createdAt) >= todayStart);
  const thisWeek = notifications.filter(n => {
    const d = new Date(n.createdAt);
    return d >= weekStart && d < todayStart;
  });
  const earlier = notifications.filter(n => new Date(n.createdAt) < weekStart);

  const renderNotification = (notif) => {
    const Icon = iconMap[notif.type] || HiBell;
    const colors = colorMap[notif.type] || 'text-gray-500 bg-gray-100 dark:bg-dark-hover';

    return (
      <motion.div
        key={notif._id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => !notif.isRead && markAsRead(notif._id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-dark-hover/50 ${
          !notif.isRead ? 'bg-primary/[0.04] dark:bg-primary/[0.06]' : ''
        }`}
      >
        {/* Sender Avatar */}
        <div className="relative flex-shrink-0">
          {notif.sender?.profilePhoto ? (
            <img
              src={notif.sender.profilePhoto}
              alt={notif.sender.name}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${colors}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          {/* Type badge on avatar */}
          {notif.sender?.profilePhoto && (
            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-bg ${colors}`}>
              <Icon className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            {notif.sender?.name && (
              <span className="font-semibold">{notif.sender.name} </span>
            )}
            <span className="text-gray-600 dark:text-gray-300">
              {notif.content?.replace(notif.sender?.name, '').trim() || getDefaultText(notif.type)}
            </span>
            <span className="text-gray-400 dark:text-gray-500 ml-1">{formatTime(notif.createdAt)}</span>
          </p>
        </div>

        {/* Unread dot */}
        {!notif.isRead && (
          <div className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />
        )}

        {/* Action button for friend requests */}
        {notif.type === 'friend_request' && !notif.isRead && (
          <button className="text-xs font-semibold text-white bg-primary hover:bg-primary-hover px-4 py-1.5 rounded-lg transition-all flex-shrink-0">
            View
          </button>
        )}
      </motion.div>
    );
  };

  const getDefaultText = (type) => {
    const defaults = {
      song_like: 'liked your song.',
      photo_like: 'liked your photo.',
      reel_like: 'liked your reel.',
      post_like: 'liked your post.',
      post_comment: 'commented on your post.',
      comment: 'commented on your post.',
      friend_request: 'sent you a friend request.',
      friend_accepted: 'accepted your friend request.',
      message: 'sent you a message.',
      playlist_invite: 'invited you to a playlist.',
      story_view: 'viewed your story.',
      call: 'tried to call you.',
      system: 'System notification.',
    };
    return defaults[type] || 'sent you a notification.';
  };

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-4 mb-1">{title}</h3>
        <div>{items.map(renderNotification)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-sm text-primary dark:text-primary-dark font-semibold hover:opacity-80 transition-opacity flex items-center gap-1">
            <HiCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      {/* Notification Groups */}
      <div className="space-y-5">
        {renderSection('Today', today)}
        {renderSection('This Week', thisWeek)}
        {renderSection('Earlier', earlier)}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center mx-auto mb-4">
            <HiBell className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No notifications yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">When someone interacts with you, you'll see it here.</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
