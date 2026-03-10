import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiMicrophone, HiSpeakerWave, HiMusicalNote, HiChatBubbleLeft, HiPhoto, HiVideoCamera, HiSparkles } from 'react-icons/hi2';
import useVoiceAssistant from '../hooks/useVoiceAssistant';

const VoiceAssistant = () => {
  const { isListening, transcript, response, startListening, stopListening, speak } = useVoiceAssistant();
  const [history, setHistory] = useState([]);

  const handleStart = () => {
    startListening();
  };

  const handleStop = () => {
    stopListening();
    if (transcript) {
      setHistory(prev => [...prev, { type: 'user', text: transcript, time: new Date() }]);
      setTimeout(() => {
        if (response) {
          setHistory(prev => [...prev, { type: 'assistant', text: response, time: new Date() }]);
        }
      }, 500);
    }
  };

  const quickCommands = [
    { icon: HiMusicalNote, label: 'Play music', command: 'Play my music', color: 'text-primary dark:text-primary-dark' },
    { icon: HiChatBubbleLeft, label: 'Open chat', command: 'Open chat', color: 'text-accent-teal' },
    { icon: HiPhoto, label: 'Show photos', command: 'Show my photos', color: 'text-accent-pink' },
    { icon: HiVideoCamera, label: 'Start call', command: 'Start a video call', color: 'text-primary dark:text-primary-dark' },
    { icon: HiSparkles, label: 'Generate music', command: 'Generate music', color: 'text-accent-pink' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Voice Assistant</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Control the app with your voice</p>
      </div>

      {/* Main Voice Interface */}
      <div className="card text-center py-12">
        <div className="relative inline-block mb-6">
          <button
            onMouseDown={handleStart}
            onMouseUp={handleStop}
            onMouseLeave={handleStop}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-primary scale-110 shadow-lg shadow-primary/30 animate-pulse'
                : 'bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:bg-dark-elevated hover:scale-105'
            }`}>
            <HiMicrophone className={`w-10 h-10 ${isListening ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
          </button>
          {isListening && (
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping" />
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {isListening ? 'Listening...' : 'Hold to speak'}
        </p>
        {transcript && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-hover/50 rounded-lg max-w-md mx-auto">
            <p className="text-sm font-medium">"{transcript}"</p>
          </div>
        )}
        {response && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg max-w-md mx-auto border border-primary/20">
            <div className="flex items-center gap-2 justify-center mb-1">
              <HiSpeakerWave className="w-4 h-4 text-primary dark:text-primary-dark" />
              <span className="text-xs text-primary dark:text-primary-dark font-medium">Assistant</span>
            </div>
            <p className="text-sm">{response}</p>
          </div>
        )}
      </div>

      {/* Quick Commands */}
      <div>
        <h2 className="text-lg font-bold mb-3">Quick Commands</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickCommands.map((cmd, i) => (
            <button key={i} onClick={() => {
              speak(cmd.command);
              setHistory(prev => [...prev, { type: 'user', text: cmd.command, time: new Date() }]);
            }}
              className="card text-center py-4 hover:bg-gray-100 dark:bg-dark-hover transition-colors">
              <cmd.icon className={`w-8 h-8 ${cmd.color} mx-auto mb-2`} />
              <span className="text-sm">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Supported Commands Info */}
      <div className="card">
        <h2 className="text-lg font-bold mb-3">Supported Commands</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Music', examples: ['"Play music"', '"Next song"', '"Pause"'] },
            { title: 'Chat', examples: ['"Open chat"', '"Send a message"'] },
            { title: 'Photos', examples: ['"Show photos"', '"Open gallery"'] },
            { title: 'Calls', examples: ['"Start a call"', '"Video call"'] },
            { title: 'AI Music', examples: ['"Generate music"', '"Create a beat"'] },
            { title: 'Navigation', examples: ['"Go to dashboard"', '"Open settings"'] },
          ].map((cat, i) => (
            <div key={i} className="bg-gray-50 dark:bg-dark-hover/50 rounded-lg p-3">
              <h3 className="font-medium text-sm mb-2">{cat.title}</h3>
              <div className="space-y-1">
                {cat.examples.map((ex, j) => (
                  <p key={j} className="text-xs text-gray-500 dark:text-gray-400">{ex}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold mb-3">History</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((item, i) => (
              <div key={i} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 rounded-lg max-w-xs text-sm ${
                  item.type === 'user' ? 'bg-primary/20 text-primary dark:text-primary-dark' : 'bg-gray-100 dark:bg-dark-hover'
                }`}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;
