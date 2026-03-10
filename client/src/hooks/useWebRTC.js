import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const useWebRTC = () => {
  const { socket, user } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected
  const [callType, setCallType] = useState(null); // voice, video
  const [remoteUser, setRemoteUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

  const getMedia = async (type) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    } catch (err) {
      if (type === 'video' && (err.name === 'NotFoundError' || err.name === 'NotReadableError')) {
        // No camera — fall back to audio-only
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      throw err;
    }
  };

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);
    pc.onicecandidate = (e) => {
      if (e.candidate && socket && remoteUser) {
        socket.emit('ice-candidate', { to: remoteUser._id || remoteUser, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') endCall();
    };
    peerConnectionRef.current = pc;
    return pc;
  }, [socket, remoteUser]);

  const startCall = useCallback(async (targetUser, type) => {
    try {
      setRemoteUser(targetUser);
      setCallType(type);
      setCallState('calling');
      const stream = await getMedia(type);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeer();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call-user', { to: targetUser._id || targetUser, offer, callType: type });
    } catch (err) {
      console.error('Failed to start call:', err);
      setCallState('idle');
      setCallType(null);
      setRemoteUser(null);
    }
  }, [createPeer, socket]);

  const answerCall = useCallback(async () => {
    const pendingOffer = peerConnectionRef.current?.pendingOffer;
    if (!pendingOffer) return;
    const from = remoteUser?._id || remoteUser;
    const type = callType;
    peerConnectionRef.current = null;
    try {
    setCallState('connected');
    const stream = await getMedia(type);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const pc = createPeer();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('call-answer', { to: from, answer });
    } catch (err) {
      console.error('Failed to answer call:', err);
      setCallState('idle');
      setCallType(null);
      setRemoteUser(null);
    }
  }, [createPeer, socket, remoteUser, callType]);

  const rejectCall = useCallback(() => {
    const targetId = remoteUser?._id || remoteUser;
    if (socket && targetId) socket.emit('reject-call', { to: targetId });
    setCallState('idle');
    setCallType(null);
    setRemoteUser(null);
  }, [socket, remoteUser]);

  const endCall = useCallback(() => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    peerConnectionRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (socket && remoteUser) socket.emit('end-call', { to: remoteUser._id || remoteUser });
    setCallState('idle');
    setCallType(null);
    setRemoteUser(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  }, [socket, remoteUser]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audio = localStreamRef.current.getAudioTracks()[0];
      if (audio) { audio.enabled = !audio.enabled; setIsMuted(!audio.enabled); }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const video = localStreamRef.current.getVideoTracks()[0];
      if (video) { video.enabled = !video.enabled; setIsVideoOff(!video.enabled); }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current) return;
    if (isScreenSharing) {
      const stream = await getMedia(callType);
      const videoTrack = stream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(videoTrack);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsScreenSharing(false);
    } else {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
      screenTrack.onended = () => toggleScreenShare();
      if (localVideoRef.current) localVideoRef.current.srcObject = screen;
      setIsScreenSharing(true);
    }
  }, [isScreenSharing, callType]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    const handleIncomingCall = ({ from, fromName, fromPhoto, offer, callType: type }) => {
      setRemoteUser({ _id: from, name: fromName, profilePhoto: fromPhoto });
      setCallType(type);
      setCallState('ringing');
      // Store offer for answering later
      peerConnectionRef.current = { pendingOffer: offer };
    };
    const handleCallAnswered = async ({ from, answer }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.setRemoteDescription) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('connected');
      }
    };
    const handleIceCandidate = async ({ from, candidate }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.addIceCandidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };
    const handleCallEnded = () => endCall();
    const handleCallRejected = () => { endCall(); };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-answered', handleCallAnswered);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-answered', handleCallAnswered);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
    };
  }, [socket, endCall]);

  return {
    callState, callType, remoteUser, isMuted, isVideoOff, isScreenSharing,
    localVideoRef, remoteVideoRef,
    startCall, answerCall, rejectCall, endCall, toggleMute, toggleVideo, toggleScreenShare,
    setRemoteUser, setCallState,
  };
};

export default useWebRTC;
