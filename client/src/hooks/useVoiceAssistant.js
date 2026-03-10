import { useState, useEffect, useCallback, useRef } from 'react';

const useVoiceAssistant = (onCommand) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map(r => r[0].transcript).join('');
      setTranscript(text);
      if (event.results[0].isFinal) {
        processCommand(text);
        setIsListening(false);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const processCommand = useCallback((text) => {
    const lower = text.toLowerCase().trim();
    let command = { action: 'unknown', text: lower };
    if (lower.includes('play') && (lower.includes('song') || lower.includes('music') || lower.includes('favorite'))) {
      command = { action: 'play_music', text: lower };
    } else if (lower.includes('open chat') || lower.includes('message')) {
      const nameMatch = lower.match(/(?:chat with|message)\s+(.+)/);
      command = { action: 'open_chat', target: nameMatch?.[1] || '', text: lower };
    } else if (lower.includes('show') && lower.includes('photo')) {
      command = { action: 'show_photos', text: lower };
    } else if (lower.includes('generate') && lower.includes('music')) {
      const prompt = lower.replace(/generate|music/g, '').trim();
      command = { action: 'generate_music', prompt: prompt || 'relaxing ambient', text: lower };
    } else if (lower.includes('call')) {
      const nameMatch = lower.match(/call\s+(.+)/);
      command = { action: 'start_call', target: nameMatch?.[1] || '', text: lower };
    }
    if (onCommand) onCommand(command);
    speak(getResponse(command));
  }, [onCommand]);

  const getResponse = (command) => {
    switch (command.action) {
      case 'play_music': return 'Playing your music now.';
      case 'open_chat': return `Opening chat${command.target ? ` with ${command.target}` : ''}.`;
      case 'show_photos': return 'Showing your photos.';
      case 'generate_music': return 'Generating music for you.';
      case 'start_call': return `Starting call${command.target ? ` with ${command.target}` : ''}.`;
      default: return "Sorry, I didn't understand that command.";
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      setSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, transcript, speaking, startListening, stopListening, speak };
};

export default useVoiceAssistant;
