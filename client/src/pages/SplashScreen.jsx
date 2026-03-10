import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const target = user ? '/' : '/login';
    const timer = setTimeout(() => navigate(target, { replace: true }), 5000);
    return () => clearTimeout(timer);
  }, [navigate, user]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden select-none"
      style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
    >
      {/* Animated glow rings */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.15, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
        >
          <div className="w-28 h-28 rounded-[2rem] bg-white/20 backdrop-blur-xl shadow-2xl flex items-center justify-center border border-white/30">
            <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
              {/* Hub icon — connected circles */}
              <motion.circle cx="32" cy="20" r="6" stroke="white" strokeWidth="2.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }} />
              <motion.circle cx="18" cy="42" r="6" stroke="white" strokeWidth="2.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }} />
              <motion.circle cx="46" cy="42" r="6" stroke="white" strokeWidth="2.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }} />
              {/* Connecting lines */}
              <motion.line x1="32" y1="26" x2="21" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }} />
              <motion.line x1="32" y1="26" x2="43" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 1.3 }} />
              <motion.line x1="24" y1="42" x2="40" y2="42" stroke="white" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 1.4 }} />
              {/* Center dot — the "hub" */}
              <motion.circle cx="32" cy="34" r="3" fill="white"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 1.6 }} />
            </svg>
          </div>
        </motion.div>

        {/* App Name */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Personal Social Hub
          </h1>
          <motion.p
            className="text-sm text-white/60 mt-1.5 font-medium tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            Your world. Connected.
          </motion.p>
        </motion.div>

        {/* Loading dots */}
        <motion.div
          className="flex gap-1.5 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-white/70"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>

      {/* Bottom tagline */}
      <motion.p
        className="absolute bottom-8 text-xs text-white/40 font-medium tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        by PuruHub
      </motion.p>
    </div>
  );
};

export default SplashScreen;
