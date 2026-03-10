import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiUserPlus, HiCheck, HiXMark, HiMagnifyingGlass, HiUserGroup, HiChatBubbleLeft, HiSparkles } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchSuggested();
  }, []);

  const fetchSuggested = async () => {
    try {
      const { data } = await API.get('/users/suggested');
      setSuggested(data);
    } catch (err) { /* ignore */ }
  };

  const sendSuggestedRequest = async (userId) => {
    try {
      await API.post('/friends/request', { toUserId: userId });
      toast.success('Friend request sent!');
      setSuggested(prev => prev.map(u => u._id === userId ? { ...u, requestSent: true } : u));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fetchFriends = async () => {
    try {
      const { data } = await API.get('/friends');
      setFriends(data);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const fetchRequests = async () => {
    try {
      const { data } = await API.get('/friends/pending');
      setRequests(data);
    } catch (err) { /* ignore */ }
  };

  const searchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await API.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data);
    } catch (err) { /* ignore */ }
    setSearching(false);
  };

  const sendRequest = async (userId) => {
    try {
      await API.post('/friends/request', { toUserId: userId });
      toast.success('Friend request sent!');
      setSearchResults(prev => prev.map(u => u._id === userId ? { ...u, requestSent: true } : u));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const acceptRequest = async (requestId) => {
    try {
      await API.put(`/friends/accept/${requestId}`);
      toast.success('Friend request accepted!');
      fetchFriends();
      fetchRequests();
    } catch (err) { toast.error('Failed'); }
  };

  const rejectRequest = async (requestId) => {
    try {
      await API.put(`/friends/reject/${requestId}`);
      fetchRequests();
    } catch (err) { toast.error('Failed'); }
  };

  const removeFriend = async (friendId) => {
    try {
      await API.delete(`/friends/${friendId}`);
      setFriends(prev => prev.filter(f => f._id !== friendId));
      toast.success('Friend removed');
    } catch (err) { toast.error('Failed'); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading friends..." />;

  const tabs = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'requests', label: `Requests (${requests.length})` },
    { id: 'search', label: 'Find People' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-teal via-primary to-accent-pink opacity-90" />
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.3\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1.5\'/%3E%3C/g%3E%3C/svg%3E")'}} />
        <div className="relative p-6">
          <h1 className="text-2xl font-extrabold text-white">Friends</h1>
          <p className="text-white/70 text-sm">Manage your connections</p>
        </div>
      </div>

      {/* Suggested Friends */}
      {suggested.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HiSparkles className="w-5 h-5 text-accent-orange" />
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Suggested Friends</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {suggested.map(u => (
              <motion.div key={u._id} whileHover={{ y: -2 }}
                className="glass-card flex-shrink-0 w-40 p-4 flex flex-col items-center gap-2 text-center">
                {u.profilePhoto ? (
                  <img src={u.profilePhoto} alt="" className="w-14 h-14 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/20 dark:to-accent-pink/20 flex items-center justify-center text-primary dark:text-primary-dark font-bold text-lg">
                    {u.name?.[0]}
                  </div>
                )}
                <div className="w-full">
                  <p className="font-semibold text-xs truncate">{u.name}</p>
                  {u.mutualFriends > 0 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{u.mutualFriends} mutual</p>
                  )}
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendSuggestedRequest(u._id)} disabled={u.requestSent}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    u.requestSent ? 'bg-gray-100 dark:bg-dark-hover text-gray-400' : 'bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-dark'
                  }`}>
                  {u.requestSent ? 'Sent' : 'Add Friend'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/60 dark:bg-dark-card/60 backdrop-blur-lg rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-dark-surface text-primary dark:text-primary-dark shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

      {/* Friends List */}
      {activeTab === 'friends' && (
        <motion.div key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
          {friends.map(friend => (
            <div key={friend._id} className="glass-card flex items-center gap-3 p-3.5">
              <div className="relative flex-shrink-0">
                {friend.profilePhoto ? (
                  <img src={friend.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/15 to-accent-pink/15 dark:from-primary/20 dark:to-accent-pink/20 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
                    {friend.name?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{friend.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{friend.bio || friend.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/chat')}
                  className="p-2 rounded-xl hover:bg-primary/10 dark:hover:bg-primary/15 text-primary dark:text-primary-dark transition-colors" title="Chat">
                  <HiChatBubbleLeft className="w-5 h-5" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFriend(friend._id)}
                  className="p-2 rounded-xl hover:bg-accent-coral/10 text-accent-coral text-xs transition-colors" title="Remove">
                  <HiXMark className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gray-100/80 dark:bg-dark-hover/50 flex items-center justify-center mx-auto mb-4">
                <HiUserGroup className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-400 dark:text-gray-500">No friends yet. Search for people to connect!</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Friend Requests */}
      {activeTab === 'requests' && (
        <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
          {requests.map(req => (
            <div key={req._id} className="glass-card flex items-center gap-3 p-3.5">
              {req.from?.profilePhoto ? (
                <img src={req.from.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-blue/15 to-accent-teal/15 flex items-center justify-center text-accent-blue font-bold">
                  {req.from?.name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{req.from?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wants to be your friend</p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => acceptRequest(req._id)}
                  className="p-2.5 rounded-xl bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal transition-colors">
                  <HiCheck className="w-5 h-5" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => rejectRequest(req._id)}
                  className="p-2.5 rounded-xl bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral transition-colors">
                  <HiXMark className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gray-100/80 dark:bg-dark-hover/50 flex items-center justify-center mx-auto mb-4">
                <HiUserPlus className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-400 dark:text-gray-500">No pending requests</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
          <form onSubmit={searchUsers} className="flex gap-2">
            <div className="flex-1 relative">
              <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10" placeholder="Search by name or email..." />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={searching} className="btn-primary px-6 disabled:opacity-50">
              {searching ? 'Searching...' : 'Search'}
            </motion.button>
          </form>
          <div className="space-y-2">
            {searchResults.map(u => {
              const isFriend = friends.some(f => f._id === u._id);
              const isSelf = u._id === user?._id;
              return (
                <div key={u._id} className="glass-card flex items-center gap-3 p-3.5">
                  {u.profilePhoto ? (
                    <img src={u.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-hover flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                      {u.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.bio || u.email}</p>
                  </div>
                  {!isSelf && !isFriend && (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendRequest(u._id)} disabled={u.requestSent}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        u.requestSent ? 'bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500' : 'bg-primary hover:bg-primary-hover text-white shadow-sm'
                      }`}>
                      <HiUserPlus className="w-4 h-4" /> {u.requestSent ? 'Sent' : 'Add'}
                    </motion.button>
                  )}
                  {isFriend && <span className="text-xs text-primary dark:text-primary-dark font-medium">Friends</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Friends;
