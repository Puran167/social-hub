import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMicrophone, HiVideoCamera, HiPhoneXMark, HiComputerDesktop,
  HiChatBubbleLeft, HiUserGroup, HiArrowsPointingOut, HiSpeakerWave,
  HiSpeakerXMark, HiVideoCameraSlash, HiPhone, HiXMark, HiPlus,
  HiCheck, HiLink
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import API from '../services/api';
import toast from 'react-hot-toast';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

const VideoCall = () => {
  const { user, socket } = useAuth();
  const [friends, setFriends] = useState([]);
  const [mode, setMode] = useState('lobby'); // lobby, calling, ringing, connected, group-lobby, group-connected
  const [callType, setCallType] = useState('video'); // voice, video
  const [remotePeer, setRemotePeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroupFriends, setSelectedGroupFriends] = useState([]);
  const [groupRoomId, setGroupRoomId] = useState(null);
  const [groupPeers, setGroupPeers] = useState([]); // [{userId, name, profilePhoto, pc, stream}]

  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const groupPeersRef = useRef([]);

  useEffect(() => { groupPeersRef.current = groupPeers; }, [groupPeers]);

  useEffect(() => { fetchFriends(); }, []);

  useEffect(() => {
    if (mode === 'connected' || mode === 'group-connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [mode]);

  // --- Media helpers ---
  const getMedia = async (type) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    } catch (err) {
      if (type === 'video' && (err.name === 'NotFoundError' || err.name === 'NotReadableError')) {
        toast('No camera found — using audio only', { icon: '🎤' });
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      throw err;
    }
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  // --- 1:1 Call Logic ---
  const createPeerConnection = (targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const s = socket || getSocket();
        if (s) s.emit('ice-candidate', { to: targetId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') handleEndCall();
    };
    return pc;
  };

  const initiateCall = async (friend, type = 'video') => {
    try {
      setRemotePeer(friend);
      setCallType(type);
      setMode('calling');
      const stream = await getMedia(type);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(friend._id);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const s = socket || getSocket();
      s.emit('call-user', { to: friend._id, offer, callType: type });
    } catch (err) {
      console.error('Call failed:', err);
      toast.error('Could not start call — check microphone permissions');
      resetCall();
    }
  };

  const handleAnswerCall = async () => {
    if (!pendingOfferRef.current) return;
    try {
      const { offer, from } = pendingOfferRef.current;
      const type = callType;
      setMode('connected');
      const stream = await getMedia(type);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(from);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const s = socket || getSocket();
      s.emit('call-answer', { to: from, answer });
      pendingOfferRef.current = null;
    } catch (err) {
      console.error('Answer failed:', err);
      toast.error('Could not answer call');
      resetCall();
    }
  };

  const handleRejectCall = () => {
    const from = pendingOfferRef.current?.from || remotePeer?._id;
    const s = socket || getSocket();
    if (s && from) s.emit('reject-call', { to: from });
    pendingOfferRef.current = null;
    resetCall();
  };

  const handleEndCall = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    const s = socket || getSocket();
    if (s && remotePeer) s.emit('end-call', { to: remotePeer._id || remotePeer });
    stopLocalStream();
    resetCall();
  }, [remotePeer, socket]);

  const resetCall = () => {
    setMode('lobby');
    setRemotePeer(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setShowChat(false);
    setChatMessages([]);
  };

  // --- Group Call Logic ---
  const createGroupRoom = () => {
    const roomId = `room_${user._id}_${Date.now()}`;
    setGroupRoomId(roomId);
    return roomId;
  };

  const startGroupCall = async () => {
    if (selectedGroupFriends.length === 0) {
      toast.error('Select at least one friend');
      return;
    }
    try {
      const roomId = createGroupRoom();
      const stream = await getMedia('video');
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const s = socket || getSocket();
      s.emit('join-room', roomId);
      setMode('group-connected');
      setShowGroupModal(false);
      // Notify selected friends
      selectedGroupFriends.forEach(friendId => {
        s.emit('call-user', { to: friendId, offer: null, callType: 'group', roomId });
      });
      toast.success('Group call started!');
    } catch (err) {
      console.error('Group call failed:', err);
      toast.error('Could not start group call');
    }
  };

  const joinGroupRoom = async (roomId) => {
    try {
      const stream = await getMedia('video');
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setGroupRoomId(roomId);
      setMode('group-connected');
      const s = socket || getSocket();
      s.emit('join-room', roomId);
    } catch (err) {
      console.error('Join room failed:', err);
      toast.error('Could not join group call');
    }
  };

  const createGroupPeerConnection = useCallback((targetUserId, targetName, targetPhoto) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const s = socket || getSocket();
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        s.emit('room-ice-candidate', { roomId: groupRoomId, to: targetUserId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      setGroupPeers(prev => prev.map(p =>
        p.userId === targetUserId ? { ...p, stream: e.streams[0] } : p
      ));
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }
    return pc;
  }, [groupRoomId, socket]);

  const leaveGroupCall = useCallback(() => {
    groupPeers.forEach(p => { if (p.pc) p.pc.close(); });
    setGroupPeers([]);
    const s = socket || getSocket();
    if (s && groupRoomId) s.emit('leave-room', groupRoomId);
    stopLocalStream();
    setGroupRoomId(null);
    setSelectedGroupFriends([]);
    resetCall();
  }, [groupPeers, groupRoomId, socket]);

  // --- Socket Events ---
  useEffect(() => {
    const s = socket || getSocket();
    if (!s) return;

    const handleIncomingCall = ({ from, fromName, fromPhoto, offer, callType: type, roomId }) => {
      if (type === 'group' && roomId) {
        // Group call invite
        toast((t) => (
          <div className="flex items-center gap-3">
            <span className="font-medium">{fromName} invites you to a group call</span>
            <button onClick={() => { toast.dismiss(t.id); joinGroupRoom(roomId); }}
              className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm font-medium">Join</button>
            <button onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded-lg text-sm">Dismiss</button>
          </div>
        ), { duration: 30000 });
        return;
      }
      // 1:1 call
      setRemotePeer({ _id: from, name: fromName, profilePhoto: fromPhoto });
      setCallType(type);
      pendingOfferRef.current = { offer, from };
      setMode('ringing');
    };

    const handleCallAnswered = async ({ from, answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setMode('connected');
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      if (pcRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      }
    };

    const handleCallEnded = () => { handleEndCall(); };
    const handleCallRejected = () => {
      toast('Call was declined', { icon: '📵' });
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      stopLocalStream();
      resetCall();
    };

    // Group events
    const handleUserJoinedRoom = async ({ userId: joinedId, name, profilePhoto }) => {
      const pc = createGroupPeerConnection(joinedId, name, profilePhoto);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit('room-offer', { roomId: groupRoomId, to: joinedId, offer });
      setGroupPeers(prev => [...prev.filter(p => p.userId !== joinedId), { userId: joinedId, name, profilePhoto, pc, stream: null }]);
    };

    const handleUserLeftRoom = ({ userId: leftId }) => {
      setGroupPeers(prev => {
        const peer = prev.find(p => p.userId === leftId);
        if (peer?.pc) peer.pc.close();
        return prev.filter(p => p.userId !== leftId);
      });
    };

    const handleRoomOffer = async ({ from, offer }) => {
      const existing = groupPeersRef.current.find(p => p.userId === from);
      const pc = existing?.pc || createGroupPeerConnection(from, existing?.name || '?', existing?.profilePhoto);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('room-answer', { roomId: groupRoomId, to: from, answer });
      if (!existing) {
        setGroupPeers(prev => [...prev, { userId: from, name: '?', profilePhoto: null, pc, stream: null }]);
      }
    };

    const handleRoomAnswer = async ({ from, answer }) => {
      const peer = groupPeersRef.current.find(p => p.userId === from);
      if (peer?.pc) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleRoomIceCandidate = async ({ from, candidate }) => {
      const peer = groupPeersRef.current.find(p => p.userId === from);
      if (peer?.pc) {
        try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      }
    };

    s.on('incoming-call', handleIncomingCall);
    s.on('call-answered', handleCallAnswered);
    s.on('ice-candidate', handleIceCandidate);
    s.on('call-ended', handleCallEnded);
    s.on('call-rejected', handleCallRejected);
    s.on('user-joined-room', handleUserJoinedRoom);
    s.on('user-left-room', handleUserLeftRoom);
    s.on('room-offer', handleRoomOffer);
    s.on('room-answer', handleRoomAnswer);
    s.on('room-ice-candidate', handleRoomIceCandidate);

    return () => {
      s.off('incoming-call', handleIncomingCall);
      s.off('call-answered', handleCallAnswered);
      s.off('ice-candidate', handleIceCandidate);
      s.off('call-ended', handleCallEnded);
      s.off('call-rejected', handleCallRejected);
      s.off('user-joined-room', handleUserJoinedRoom);
      s.off('user-left-room', handleUserLeftRoom);
      s.off('room-offer', handleRoomOffer);
      s.off('room-answer', handleRoomAnswer);
      s.off('room-ice-candidate', handleRoomIceCandidate);
    };
  }, [socket, handleEndCall, createGroupPeerConnection, groupRoomId]);

  // --- Controls ---
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audio = localStreamRef.current.getAudioTracks()[0];
      if (audio) { audio.enabled = !audio.enabled; setIsMuted(!audio.enabled); }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const video = localStreamRef.current.getVideoTracks()[0];
      if (video) { video.enabled = !video.enabled; setIsVideoOff(!video.enabled); }
    }
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    if (isScreenSharing) {
      const stream = await getMedia(callType);
      const videoTrack = stream.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) await sender.replaceTrack(videoTrack);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screen.getVideoTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
        screenTrack.onended = () => toggleScreenShare();
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        setIsScreenSharing(true);
      } catch (err) { /* user cancelled */ }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const { data } = await API.get('/friends');
      setFriends(data);
    } catch (err) { /* ignore */ }
  };

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    setChatMessages(prev => [...prev, { sender: user?.name, text: chatText, time: new Date() }]);
    setChatText('');
  };

  const toggleGroupFriend = (friendId) => {
    setSelectedGroupFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  // ====== ACTIVE CALL VIEW (1:1) ======
  if (mode === 'calling' || mode === 'connected') {
    return (
      <div ref={containerRef} className="h-[calc(100vh-140px)] bg-surface dark:bg-dark-bg rounded-xl overflow-hidden relative flex">
        <div className="flex-1 relative">
          {/* Remote Video */}
          <div className="absolute inset-0 bg-black">
            {mode === 'connected' ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="relative mx-auto mb-4">
                    {remotePeer?.profilePhoto ? (
                      <img src={remotePeer.profilePhoto} alt="" className="w-28 h-28 rounded-full mx-auto object-cover border-4 border-primary/30" />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-4 border-primary/30">
                        <span className="text-4xl font-bold text-primary">{remotePeer?.name?.[0] || '?'}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                  </motion.div>
                  <p className="text-lg font-medium text-white">{remotePeer?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-400 mt-1">Calling...</p>
                </div>
              </div>
            )}
          </div>

          {/* Local Video (PiP) */}
          <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg z-10 bg-black">
            {!isVideoOff ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary">{user?.name?.[0]}</span>
                </div>
              </div>
            )}
          </div>

          {mode === 'connected' && (
            <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm text-white z-10">
              {formatDuration(callDuration)}
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            <div className="flex items-center justify-center gap-3">
              <button onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <HiSpeakerXMark className="w-6 h-6" /> : <HiMicrophone className="w-6 h-6" />}
              </button>
              <button onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
                {isVideoOff ? <HiVideoCameraSlash className="w-6 h-6" /> : <HiVideoCamera className="w-6 h-6" />}
              </button>
              {mode === 'connected' && (
                <>
                  <button onClick={toggleScreenShare}
                    className={`p-4 rounded-full transition-all ${isScreenSharing ? 'bg-primary text-white' : 'bg-white/15 text-white hover:bg-white/25'}`} title="Share screen">
                    <HiComputerDesktop className="w-6 h-6" />
                  </button>
                  <button onClick={() => setShowChat(!showChat)}
                    className={`p-4 rounded-full transition-all ${showChat ? 'bg-primary text-white' : 'bg-white/15 text-white hover:bg-white/25'}`} title="Chat">
                    <HiChatBubbleLeft className="w-6 h-6" />
                  </button>
                  <button onClick={toggleFullscreen}
                    className="p-4 rounded-full bg-white/15 text-white hover:bg-white/25 transition-all" title="Fullscreen">
                    <HiArrowsPointingOut className="w-6 h-6" />
                  </button>
                </>
              )}
              <button onClick={handleEndCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all ml-4" title="End call">
                <HiPhoneXMark className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* In-call Chat */}
        {showChat && (
          <div className="w-80 bg-white dark:bg-dark-card border-l border-gray-200 dark:border-dark-border flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-dark-border">
              <h3 className="font-medium text-sm">In-call Messages</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  <span className="text-xs font-medium text-primary dark:text-primary-dark">{msg.sender}</span>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{msg.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendChatMessage} className="p-3 border-t border-gray-200 dark:border-dark-border">
              <div className="flex gap-2">
                <input type="text" value={chatText} onChange={e => setChatText(e.target.value)}
                  className="input-field flex-1 py-2 text-sm" placeholder="Type a message..." />
                <button type="submit" className="btn-primary text-sm px-3">Send</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ====== GROUP CALL ACTIVE VIEW ======
  if (mode === 'group-connected') {
    return (
      <div ref={containerRef} className="h-[calc(100vh-140px)] bg-gray-900 rounded-xl overflow-hidden relative">
        {/* Grid of participants */}
        <div className={`w-full h-full grid gap-2 p-2 ${
          groupPeers.length === 0 ? 'grid-cols-1' :
          groupPeers.length <= 1 ? 'grid-cols-2' :
          groupPeers.length <= 3 ? 'grid-cols-2 grid-rows-2' :
          'grid-cols-3 grid-rows-2'
        }`}>
          {/* Self */}
          <div className="relative rounded-xl overflow-hidden bg-gray-800">
            {!isVideoOff ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{user?.name?.[0]}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md text-xs text-white">
              You {isMuted && '(muted)'}
            </div>
          </div>

          {/* Remote peers */}
          {groupPeers.map(peer => (
            <div key={peer.userId} className="relative rounded-xl overflow-hidden bg-gray-800">
              {peer.stream ? (
                <GroupVideo stream={peer.stream} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-accent-teal/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent-teal">{peer.name?.[0] || '?'}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md text-xs text-white">
                {peer.name || 'Participant'}
              </div>
            </div>
          ))}
        </div>

        {/* Duration */}
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm text-white z-10">
          {formatDuration(callDuration)} · {groupPeers.length + 1} participants
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="flex items-center justify-center gap-3">
            <button onClick={toggleMute}
              className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              {isMuted ? <HiSpeakerXMark className="w-6 h-6" /> : <HiMicrophone className="w-6 h-6" />}
            </button>
            <button onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              {isVideoOff ? <HiVideoCameraSlash className="w-6 h-6" /> : <HiVideoCamera className="w-6 h-6" />}
            </button>
            <button onClick={toggleFullscreen}
              className="p-4 rounded-full bg-white/15 text-white hover:bg-white/25 transition-all">
              <HiArrowsPointingOut className="w-6 h-6" />
            </button>
            <button onClick={leaveGroupCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all ml-4">
              <HiPhoneXMark className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== INCOMING CALL RINGING VIEW ======
  if (mode === 'ringing') {
    return (
      <div className="h-[calc(100vh-140px)] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="relative mb-6 mx-auto w-fit">
            {remotePeer?.profilePhoto ? (
              <img src={remotePeer.profilePhoto} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white/20" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white/20">
                <span className="text-4xl font-bold text-white">{remotePeer?.name?.[0] || '?'}</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full border-4 border-green-400/30 animate-ping" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-1">{remotePeer?.name || 'Unknown'}</h2>
          <p className="text-white/50 mb-10">{callType === 'video' ? 'Incoming video call...' : 'Incoming voice call...'}</p>
          <div className="flex items-center justify-center gap-6">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleRejectCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <HiPhoneXMark className="w-8 h-8 text-white" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleAnswerCall}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <HiPhone className="w-8 h-8 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ====== LOBBY VIEW ======
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Video Calls</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Call your friends with video and screen sharing</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 cursor-default">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
              <HiVideoCamera className="w-7 h-7 text-primary dark:text-primary-dark" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Start a Video Call</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a friend from below to call</p>
            </div>
          </div>
        </div>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => { setShowGroupModal(true); setSelectedGroupFriends([]); }}
          className="card bg-gradient-to-br from-accent-teal/20 to-accent-teal/5 border border-accent-teal/20 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent-teal/20 rounded-full flex items-center justify-center">
              <HiUserGroup className="w-7 h-7 text-accent-teal" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Group Calls</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start a call with multiple friends</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Friends to Call */}
      <div>
        <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">Your Friends</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {friends.map(friend => (
            <div key={friend._id} className="card flex items-center gap-3">
              {friend.profilePhoto ? (
                <img src={friend.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
                  {friend.name?.[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-100">{friend.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{friend.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => initiateCall(friend, 'voice')}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-accent-teal transition-colors" title="Voice call">
                  <HiPhone className="w-5 h-5" />
                </button>
                <button onClick={() => initiateCall(friend, 'video')}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover text-primary dark:text-primary-dark transition-colors" title="Video call">
                  <HiVideoCamera className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div className="col-span-full text-center py-12">
              <HiUserGroup className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Add friends to start calling</p>
            </div>
          )}
        </div>
      </div>

      {/* Group Call Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowGroupModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-card p-5 w-full max-w-md mx-4 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold gradient-text">Start Group Call</h3>
                <button onClick={() => setShowGroupModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg">
                  <HiXMark className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select friends to invite ({selectedGroupFriends.length} selected)</p>
              <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
                {friends.map(friend => {
                  const isSelected = selectedGroupFriends.includes(friend._id);
                  return (
                    <div key={friend._id} onClick={() => toggleGroupFriend(friend._id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-gray-50/80 dark:hover:bg-dark-hover/50'
                      }`}>
                      {friend.profilePhoto ? (
                        <img src={friend.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-primary dark:text-primary-dark font-bold">
                          {friend.name?.[0]}
                        </div>
                      )}
                      <span className="font-medium text-sm flex-1 text-gray-800 dark:text-gray-100">{friend.name}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary text-white' : 'border-2 border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <HiCheck className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
                {friends.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No friends yet. Add friends first!</p>}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startGroupCall}
                disabled={selectedGroupFriends.length === 0}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedGroupFriends.length > 0
                    ? 'nebula-gradient text-white shadow-glow-sm hover:opacity-90'
                    : 'bg-gray-200 dark:bg-dark-hover text-gray-400 cursor-not-allowed'
                }`}
              >
                <HiVideoCamera className="w-5 h-5" />
                Start Group Call ({selectedGroupFriends.length})
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper component for group video streams
const GroupVideo = ({ stream }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default VideoCall;
