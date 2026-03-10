import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPaperAirplane, HiPhoto, HiPaperClip, HiFaceSmile, HiMicrophone, HiPhone,
  HiVideoCamera, HiMagnifyingGlass, HiEllipsisVertical, HiCheck, HiArrowLeft, HiPlus,
  HiXMark, HiSpeakerWave, HiSpeakerXMark, HiUserGroup, HiUserPlus, HiUserMinus
} from 'react-icons/hi2';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import useWebRTC from '../hooks/useWebRTC';
import API from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const Chat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [recording, setRecording] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [friends, setFriends] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const selectedConvRef = useRef(null);

  const {
    callState, callType, remoteUser: callRemoteUser, isMuted, isVideoOff,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, rejectCall, endCall, toggleMute, toggleVideo,
  } = useWebRTC();

  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);

  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  const formatCallDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleVoiceCall = () => {
    if (!selectedConv) return;
    const other = getOtherUser(selectedConv);
    if (!other._id) return;
    startCall(other, 'voice');
  };

  const handleVideoCall = () => {
    if (!selectedConv) return;
    const other = getOtherUser(selectedConv);
    if (!other._id) return;
    startCall(other, 'video');
  };

  useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (message) => {
      const currentConv = selectedConvRef.current;
      // Deduplicate: only add if not already in messages
      if (message.conversationId === currentConv?._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      setConversations(prev => {
        const exists = prev.some(c => c._id === message.conversationId);
        if (!exists) {
          // New conversation from someone - refetch conversations
          fetchConversations();
          return prev;
        }
        return prev.map(c =>
          c._id === message.conversationId ? { ...c, lastMessage: message, updatedAt: new Date().toISOString() } : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('new-message', onNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('user-online', ({ userId: uid, isOnline }) => {
      if (isOnline) {
        setOnlineUsers(prev => new Set([...prev, uid]));
      } else {
        setOnlineUsers(prev => { const n = new Set(prev); n.delete(uid); return n; });
      }
    });

    socket.on('new-group', (conv) => {
      setConversations(prev => [conv, ...prev.filter(c => c._id !== conv._id)]);
    });
    socket.on('group-updated', (conv) => {
      setConversations(prev => prev.map(c => c._id === conv._id ? conv : c));
      setSelectedConv(prev => prev?._id === conv._id ? conv : prev);
    });
    socket.on('removed-from-group', ({ conversationId }) => {
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      setSelectedConv(prev => prev?._id === conversationId ? null : prev);
    });
    socket.on('group-member-left', ({ conversationId, userId: leftUserId }) => {
      setConversations(prev => prev.map(c => c._id === conversationId
        ? { ...c, participants: c.participants.filter(p => p._id !== leftUserId) }
        : c
      ));
    });
    socket.on('message-reaction', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });

    return () => {
      socket.off('new-message', onNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('user-online');
      socket.off('new-group');
      socket.off('group-updated');
      socket.off('removed-from-group');
      socket.off('group-member-left');
      socket.off('message-reaction');
    };
  }, []);

  const handleTyping = useCallback(({ userId, isTyping }) => {
    if (isTyping) {
      setTypingUsers(prev => ({ ...prev, [userId]: true }));
    } else {
      setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await API.get('/chat/conversations');
      setConversations(data);
    } catch (err) { /* ignore */ }
    setLoading(false);
  };

  const fetchMessages = async (convId) => {
    setMessagesLoading(true);
    try {
      const { data } = await API.get(`/chat/messages/${convId}`);
      setMessages(data);
      const socket = getSocket();
      if (socket) socket.emit('join-chat', convId);
    } catch (err) { /* ignore */ }
    setMessagesLoading(false);
  };

  const selectConversation = (conv) => {
    if (selectedConv?._id) {
      const socket = getSocket();
      if (socket) socket.emit('leave-chat', selectedConv._id);
    }
    setSelectedConv(conv);
    fetchMessages(conv._id);
    setShowSidebar(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedConv) return;
    try {
      const { data } = await API.post('/chat/messages', { conversationId: selectedConv._id, content: text, type: 'text' });
      setMessages(prev => [...prev, data]);
      setText('');
      setShowEmoji(false);
      emitStopTyping();
    } catch (err) { toast.error('Failed to send'); }
  };

  const sendFile = async (file, type) => {
    if (!selectedConv) return;
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    form.append('conversationId', selectedConv._id);
    try {
      const { data } = await API.post('/chat/messages', form);
      setMessages(prev => [...prev, data]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send file';
      toast.error(msg);
    } finally {
      // Reset file inputs so the same file can be selected again
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const emitTyping = () => {
    const socket = getSocket();
    if (!socket || !selectedConv) return;
    socket.emit('typing', { conversationId: selectedConv._id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(emitStopTyping, 2000);
  };

  const emitStopTyping = () => {
    const socket = getSocket();
    if (socket && selectedConv) socket.emit('typing', { conversationId: selectedConv._id, isTyping: false });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        sendFile(audioFile, 'voice');
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err) { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const startNewChat = async (friendId) => {
    try {
      const { data } = await API.post('/chat/conversations', { userId: friendId });
      setConversations(prev => [data, ...prev.filter(c => c._id !== data._id)]);
      selectConversation(data);
      setShowNewChat(false);
    } catch (err) { toast.error('Failed to create chat'); }
  };

  const fetchFriends = async () => {
    try {
      const { data } = await API.get('/friends');
      setFriends(data);
    } catch (err) { /* ignore */ }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast.error('Enter a group name and select at least one member');
      return;
    }
    try {
      const { data } = await API.post('/chat/groups', { name: groupName, memberIds: selectedMembers });
      setConversations(prev => [data, ...prev]);
      selectConversation(data);
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      toast.success('Group created!');
    } catch (err) { toast.error('Failed to create group'); }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const reactToMessage = async (messageId, emoji) => {
    try {
      const { data } = await API.post(`/chat/messages/${messageId}/react`, { emoji });
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: data.reactions } : m));
    } catch (err) { toast.error('Failed to react'); }
  };

  const leaveGroup = async (convId) => {
    try {
      await API.put(`/chat/groups/${convId}/leave`);
      setConversations(prev => prev.filter(c => c._id !== convId));
      setSelectedConv(null);
      setShowGroupInfo(false);
      toast.success('Left group');
    } catch (err) { toast.error('Failed to leave group'); }
  };

  const addGroupMember = async (convId, userId) => {
    try {
      const { data } = await API.post(`/chat/groups/${convId}/members`, { userId });
      setSelectedConv(data);
      setConversations(prev => prev.map(c => c._id === data._id ? data : c));
      toast.success('Member added');
    } catch (err) { toast.error('Failed to add member'); }
  };

  const removeGroupMember = async (convId, userId) => {
    try {
      const { data } = await API.delete(`/chat/groups/${convId}/members`, { data: { userId } });
      setSelectedConv(data);
      setConversations(prev => prev.map(c => c._id === data._id ? data : c));
      toast.success('Member removed');
    } catch (err) { toast.error('Failed to remove member'); }
  };

  const getOtherUser = (conv) => {
    if (!conv?.participants) return {};
    return conv.participants.find(p => p._id !== user?._id) || conv.participants[0] || {};
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today - 86400000);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(c => {
    if (c.isGroup) {
      return c.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const other = getOtherUser(c);
    return other.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) return <LoadingSpinner size="lg" text="Loading chats..." />;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-dark-card rounded-2xl overflow-hidden border border-gray-200/40 dark:border-dark-border/40 shadow-soft">
      {/* Conversation List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200/40 dark:border-dark-border/30 flex flex-col ${!showSidebar ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200/40 dark:border-dark-border/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-extrabold gradient-text">Chats</h2>
            <div className="flex items-center gap-1">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowCreateGroup(true); fetchFriends(); }}
                className="p-2 hover:bg-primary/10 dark:hover:bg-primary/15 rounded-xl transition-colors" title="Create Group">
                <HiUserGroup className="w-5 h-5 text-primary dark:text-primary-dark" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowNewChat(true); fetchFriends(); }}
                className="p-2 hover:bg-primary/10 dark:hover:bg-primary/15 rounded-xl transition-colors" title="New Chat">
                <HiPlus className="w-5 h-5 text-primary dark:text-primary-dark" />
              </motion.button>
            </div>
          </div>
          <div className="relative">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="input-field w-full pl-9 py-2 text-sm" placeholder="Search conversations..." />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(conv => {
            const isGroup = conv.isGroup;
            const other = isGroup ? null : getOtherUser(conv);
            const displayName = isGroup ? conv.groupName : other?.name;
            const displayPhoto = isGroup ? conv.groupPhoto : other?.profilePhoto;
            const isOnline = !isGroup && onlineUsers.has(other?._id);
            const isActive = selectedConv?._id === conv._id;
            const typingInConv = isGroup
              ? Object.keys(typingUsers).some(uid => conv.participants.some(p => p._id === uid && uid !== user?._id))
              : typingUsers[other?._id];
            return (
              <div key={conv._id} onClick={() => selectConversation(conv)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${isActive ? 'bg-primary/8 dark:bg-primary/10' : 'hover:bg-gray-50/80 dark:hover:bg-dark-hover/50'}`}>
                <div className="relative flex-shrink-0">
                  {isGroup ? (
                    displayPhoto ? (
                      <img src={displayPhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent-pink/15 dark:bg-accent-pink/20 flex items-center justify-center">
                        <HiUserGroup className="w-6 h-6 text-accent-pink" />
                      </div>
                    )
                  ) : (
                    displayPhoto ? (
                      <img src={displayPhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
                        {displayName?.[0]}
                      </div>
                    )
                  )}
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-teal rounded-full border-2 border-white dark:border-dark-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate text-gray-800 dark:text-gray-100">
                      {displayName}
                      {isGroup && <span className="text-[10px] text-gray-400 ml-1">({conv.participants?.length})</span>}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTime(conv.updatedAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {typingInConv ? (
                      <span className="text-primary dark:text-primary-dark italic">typing...</span>
                    ) : conv.lastMessage?.type === 'image' ? '📷 Photo' :
                      conv.lastMessage?.type === 'file' ? '📎 File' :
                      conv.lastMessage?.type === 'voice' ? '🎤 Voice message' :
                      conv.lastMessage?.type === 'system' ? conv.lastMessage?.content :
                      conv.lastMessage?.content || 'Start chatting'}
                  </p>
                </div>
              </div>
            );
          })}
          {filteredConversations.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No conversations yet</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-3 border-b border-gray-200/60 dark:border-dark-border/60 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-lg">
              <button onClick={() => setShowSidebar(true)} className="md:hidden p-1">
                <HiArrowLeft className="w-5 h-5" />
              </button>
              {selectedConv.isGroup ? (
                <>
                  <div className="relative cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                    {selectedConv.groupPhoto ? (
                      <img src={selectedConv.groupPhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent-pink/15 dark:bg-accent-pink/20 flex items-center justify-center">
                        <HiUserGroup className="w-5 h-5 text-accent-pink" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{selectedConv.groupName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedConv.participants?.length} members
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowGroupInfo(true)} className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl transition-colors">
                      <HiEllipsisVertical className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    {getOtherUser(selectedConv).profilePhoto ? (
                      <img src={getOtherUser(selectedConv).profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark text-sm font-bold">
                        {getOtherUser(selectedConv).name?.[0]}
                      </div>
                    )}
                    {onlineUsers.has(getOtherUser(selectedConv)._id) && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-teal rounded-full border-2 border-white dark:border-dark-surface" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{getOtherUser(selectedConv).name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Object.keys(typingUsers).length > 0 ? (
                        <span className="text-primary dark:text-primary-dark">typing...</span>
                      ) : onlineUsers.has(getOtherUser(selectedConv)._id) ? (
                        <span className="text-accent-teal">online</span>
                      ) : 'offline'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={handleVoiceCall} className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl transition-colors"><HiPhone className="w-5 h-5 text-primary dark:text-primary-dark" /></button>
                    <button onClick={handleVideoCall} className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl transition-colors"><HiVideoCamera className="w-5 h-5 text-primary dark:text-primary-dark" /></button>
                    <button className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl transition-colors"><HiEllipsisVertical className="w-5 h-5" /></button>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-surface/30 dark:bg-dark-bg/30">
              {messagesLoading ? (
                <LoadingSpinner text="Loading messages..." />
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
                    const showDate = i === 0 || formatDate(msg.createdAt) !== formatDate(messages[i-1]?.createdAt);
                    return (
                      <React.Fragment key={msg._id || i}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 text-[11px] px-3 py-1 rounded-full font-medium">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        {msg.type === 'system' ? (
                          <div className="flex justify-center my-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">{msg.content}</span>
                          </div>
                        ) : (
                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group/msg`}>
                            <div className="max-w-[75%]">
                              {/* Sender name for group messages */}
                              {selectedConv?.isGroup && !isOwn && (
                                <p className="text-[10px] font-semibold text-primary dark:text-primary-dark ml-3 mb-0.5">
                                  {msg.sender?.name || 'Unknown'}
                                </p>
                              )}
                              <div className={`relative px-3.5 py-2 ${
                                isOwn
                                  ? 'bg-primary dark:bg-primary-dark text-white rounded-2xl rounded-br-md'
                                  : 'bg-white dark:bg-dark-elevated text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-md shadow-sm'
                              }`}>
                                {msg.type === 'image' && (
                                  <img src={msg.fileUrl} alt="" className="rounded-xl max-w-full mb-1" />
                                )}
                                {msg.type === 'voice' && (
                                  <audio controls src={msg.fileUrl} className="max-w-[250px]" />
                                )}
                                {msg.type === 'file' && (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-black/10 dark:bg-white/10 p-2 rounded-lg mb-1">
                                    <HiPaperClip className="w-5 h-5" />
                                    <span className="text-sm underline truncate">{msg.fileName || 'File'}</span>
                                  </a>
                                )}
                                {msg.content && <p className="text-sm break-words">{msg.content}</p>}
                                <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                  <span className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
                                  {isOwn && (
                                    <HiCheck className={`w-3 h-3 ${msg.readBy?.length > 1 ? 'text-accent-mint' : 'opacity-60'}`} />
                                  )}
                                </div>
                                {/* Quick Reaction Bar */}
                                <div className={`absolute ${isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                                  <div className="flex gap-0.5 bg-white dark:bg-dark-elevated rounded-full shadow-lg px-1 py-0.5 border border-gray-200/60 dark:border-dark-border/40">
                                    {['❤️', '👍', '😂', '😮', '😢'].map(emoji => (
                                      <button key={emoji} onClick={() => reactToMessage(msg._id, emoji)}
                                        className="w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform text-sm">
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {/* Reaction Badges */}
                              {msg.reactions?.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
                                  {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                                    <button key={emoji} onClick={() => reactToMessage(msg._id, emoji)}
                                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                        msg.reactions.some(r => r.emoji === emoji && (r.user === user?._id || r.user?._id === user?._id))
                                          ? 'bg-primary/10 dark:bg-primary/15 border-primary/30 text-primary dark:text-primary-dark'
                                          : 'bg-gray-100 dark:bg-dark-elevated border-gray-200/60 dark:border-dark-border/40 text-gray-600 dark:text-gray-400'
                                      }`}>
                                      <span>{emoji}</span>
                                      <span className="text-[10px] font-medium">{count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-200/60 dark:border-dark-border/60 bg-white/50 dark:bg-dark-surface/50 backdrop-blur-lg">
              <div className="relative">
                {showEmoji && (
                  <div className="absolute bottom-full mb-2 left-0 z-50">
                    <EmojiPicker theme="dark" onEmojiClick={(e) => setText(prev => prev + e.emoji)}
                      width={320} height={350} />
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                    className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl flex-shrink-0 transition-colors">
                    <HiFaceSmile className="w-5 h-5 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => imageInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl flex-shrink-0 transition-colors">
                    <HiPhoto className="w-5 h-5 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-xl flex-shrink-0 transition-colors">
                    <HiPaperClip className="w-5 h-5 text-gray-400" />
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files[0] && sendFile(e.target.files[0], 'image')} />
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={e => e.target.files[0] && sendFile(e.target.files[0], 'file')} />
                  <input type="text" value={text}
                    onChange={e => { setText(e.target.value); emitTyping(); }}
                    className="input-field flex-1 py-2.5" placeholder="Type a message..." />
                  {text.trim() ? (
                    <button type="submit" className="p-2.5 nebula-gradient rounded-xl hover:opacity-90 flex-shrink-0 shadow-glow-sm transition-all">
                      <HiPaperAirplane className="w-5 h-5 text-white" />
                    </button>
                  ) : (
                    <button type="button"
                      onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording}
                      className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${recording ? 'bg-accent-coral animate-pulse' : 'nebula-gradient hover:opacity-90 shadow-glow-sm'}`}>
                      <HiMicrophone className="w-5 h-5 text-white" />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-24 h-24 nebula-gradient rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-glow">
                <HiPaperAirplane className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-extrabold mb-1 text-gray-800 dark:text-gray-100">Your Messages</h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">Select a conversation to start chatting, or create a new one</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNewChat(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass-card p-5 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold mb-4 gradient-text">New Chat</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {friends.map(friend => (
                <div key={friend._id} onClick={() => startNewChat(friend._id)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50/80 dark:hover:bg-dark-hover/50 cursor-pointer transition-colors">
                  {friend.profilePhoto ? (
                    <img src={friend.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
                      {friend.name?.[0]}
                    </div>
                  )}
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-100">{friend.name}</span>
                </div>
              ))}
              {friends.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">No friends yet. Add friends first!</p>}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowCreateGroup(false); setGroupName(''); setSelectedMembers([]); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass-card p-5 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold mb-4 gradient-text">Create Group</h3>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
              className="input-field w-full py-2.5 mb-3" placeholder="Group name..." />
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select members ({selectedMembers.length} selected)</p>
            <div className="max-h-52 overflow-y-auto space-y-1 mb-4">
              {friends.map(friend => {
                const isSelected = selectedMembers.includes(friend._id);
                return (
                  <div key={friend._id} onClick={() => toggleMember(friend._id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-gray-50/80 dark:hover:bg-dark-hover/50'}`}>
                    {friend.profilePhoto ? (
                      <img src={friend.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
                        {friend.name?.[0]}
                      </div>
                    )}
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 flex-1">{friend.name}</span>
                    {isSelected && <HiCheck className="w-5 h-5 text-primary dark:text-primary-dark" />}
                  </div>
                );
              })}
              {friends.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">No friends yet.</p>}
            </div>
            <button onClick={createGroup} disabled={!groupName.trim() || selectedMembers.length === 0}
              className="w-full py-2.5 nebula-gradient text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Create Group
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Group Info Panel */}
      {showGroupInfo && selectedConv?.isGroup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowGroupInfo(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass-card p-5 w-full max-w-sm mx-4 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold gradient-text">Group Info</h3>
              <button onClick={() => setShowGroupInfo(false)} className="p-1 hover:bg-gray-100/80 dark:hover:bg-dark-hover/80 rounded-lg">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative group/photo cursor-pointer" onClick={() => {
                if (selectedConv.admin === user?._id || selectedConv.admin?._id === user?._id) {
                  document.getElementById('groupPhotoInput')?.click();
                }
              }}>
                {selectedConv.groupPhoto ? (
                  <img src={selectedConv.groupPhoto} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-accent-pink/15 dark:bg-accent-pink/20 flex items-center justify-center">
                    <HiUserGroup className="w-7 h-7 text-accent-pink" />
                  </div>
                )}
                {(selectedConv.admin === user?._id || selectedConv.admin?._id === user?._id) && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    <HiPhoto className="w-5 h-5 text-white" />
                  </div>
                )}
                <input id="groupPhotoInput" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('groupPhoto', file);
                  try {
                    const { data } = await API.put(`/chat/groups/${selectedConv._id}`, form);
                    setSelectedConv(data);
                    setConversations(prev => prev.map(c => c._id === data._id ? data : c));
                    toast.success('Group photo updated!');
                  } catch (err) { toast.error('Failed to update photo'); }
                  e.target.value = '';
                }} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{selectedConv.groupName}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedConv.participants?.length} members</p>
                {(selectedConv.admin === user?._id || selectedConv.admin?._id === user?._id) && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Tap photo to change</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Members</h4>
                {selectedConv.admin === user?._id && (
                  <button onClick={() => { fetchFriends(); }} className="text-xs text-primary dark:text-primary-dark hover:underline flex items-center gap-1">
                    <HiUserPlus className="w-4 h-4" /> Add
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {selectedConv.participants?.map(member => (
                  <div key={member._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/50 dark:hover:bg-dark-hover/30">
                    {member.profilePhoto ? (
                      <img src={member.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark text-sm font-bold">
                        {member.name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate block">
                        {member.name} {member._id === user?._id && '(You)'}
                      </span>
                      {member._id === selectedConv.admin && (
                        <span className="text-[10px] text-primary dark:text-primary-dark font-semibold">Admin</span>
                      )}
                    </div>
                    {selectedConv.admin === user?._id && member._id !== user?._id && (
                      <button onClick={() => removeGroupMember(selectedConv._id, member._id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Remove member">
                        <HiUserMinus className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add member section for admin */}
            {selectedConv.admin === user?._id && friends.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Add Members</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {friends.filter(f => !selectedConv.participants?.some(p => p._id === f._id)).map(friend => (
                    <div key={friend._id} onClick={() => addGroupMember(selectedConv._id, friend._id)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/80 dark:hover:bg-dark-hover/50 cursor-pointer transition-colors">
                      {friend.profilePhoto ? (
                        <img src={friend.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark text-xs font-bold">
                          {friend.name?.[0]}
                        </div>
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{friend.name}</span>
                      <HiUserPlus className="w-4 h-4 text-primary dark:text-primary-dark" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => leaveGroup(selectedConv._id)}
              className="w-full py-2.5 bg-red-500/10 text-red-500 font-semibold rounded-xl hover:bg-red-500/20 transition-colors text-sm">
              Leave Group
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Call Overlay */}
      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" />

            {/* Video elements (hidden for voice calls) */}
            <video ref={remoteVideoRef} autoPlay playsInline
              className={`absolute inset-0 w-full h-full object-cover ${callType === 'video' && callState === 'connected' ? '' : 'hidden'}`} />
            <video ref={localVideoRef} autoPlay playsInline muted
              className={`absolute bottom-28 right-4 w-36 h-48 object-cover rounded-2xl border-2 border-white/20 shadow-xl z-10 ${callType === 'video' && callState === 'connected' ? '' : 'hidden'}`} />

            {/* Call Info */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative mb-6"
              >
                {(callState === 'calling' || callState === 'ringing') && (
                  <>
                    <div className="absolute inset-0 w-28 h-28 rounded-full bg-primary/30 animate-ping" />
                    <div className="absolute -inset-2 w-32 h-32 rounded-full bg-primary/15 animate-pulse" />
                  </>
                )}
                {callRemoteUser?.profilePhoto ? (
                  <img src={callRemoteUser.profilePhoto} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white/20 relative" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center text-white text-4xl font-bold border-4 border-white/20 relative">
                    {callRemoteUser?.name?.[0] || '?'}
                  </div>
                )}
              </motion.div>

              {/* Name & Status */}
              <h2 className="text-white text-2xl font-bold mb-1">{callRemoteUser?.name || 'Unknown'}</h2>
              <p className="text-white/60 text-sm mb-8">
                {callState === 'calling' && 'Calling...'}
                {callState === 'ringing' && (callType === 'video' ? 'Incoming video call...' : 'Incoming voice call...')}
                {callState === 'connected' && formatCallDuration(callDuration)}
              </p>

              {/* Call Type Icon */}
              {(callState === 'calling' || callState === 'ringing') && (
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="mb-10"
                >
                  {callType === 'video' ? (
                    <HiVideoCamera className="w-10 h-10 text-white/40" />
                  ) : (
                    <HiPhone className="w-10 h-10 text-white/40" />
                  )}
                </motion.div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-5">
                {/* Incoming call: Accept + Reject */}
                {callState === 'ringing' && (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={rejectCall}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
                    >
                      <HiXMark className="w-8 h-8 text-white" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={answerCall}
                      className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 transition-colors"
                    >
                      <HiPhone className="w-8 h-8 text-white" />
                    </motion.button>
                  </>
                )}

                {/* Calling: only End */}
                {callState === 'calling' && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
                  >
                    <HiPhone className="w-8 h-8 text-white rotate-[135deg]" />
                  </motion.button>
                )}

                {/* Connected: Mute, Video Toggle, End */}
                {callState === 'connected' && (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleMute}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                        isMuted ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {isMuted ? (
                        <HiSpeakerXMark className="w-6 h-6 text-white" />
                      ) : (
                        <HiSpeakerWave className="w-6 h-6 text-white" />
                      )}
                    </motion.button>

                    {callType === 'video' && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleVideo}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                          isVideoOff ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        <HiVideoCamera className={`w-6 h-6 ${isVideoOff ? 'text-red-400' : 'text-white'}`} />
                      </motion.button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={endCall}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
                    >
                      <HiPhone className="w-8 h-8 text-white rotate-[135deg]" />
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
