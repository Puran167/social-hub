import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiEyeSlash, HiDevicePhoneMobile, HiEnvelope } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [authMode, setAuthMode] = useState('email');
  const [phoneStep, setPhoneStep] = useState('number');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin, phoneLogin } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
        callback: () => {},
      });
    }
    return window.recaptchaVerifier;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse);
      toast.success('Welcome!');
      navigate('/');
    } catch (err) {
      toast.error('Google login failed');
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Enter your phone number');
    setLoading(true);
    try {
      const appVerifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmResult(result);
      setPhoneStep('otp');
      toast.success('OTP sent! Check your phone.');
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Enter the OTP');
    setLoading(true);
    try {
      const userCredential = await confirmResult.confirm(otp);
      const firebaseToken = await userCredential.user.getIdToken();
      await phoneLogin(firebaseToken);
      toast.success('Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg flex items-center justify-center p-4 transition-colors relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/15 dark:bg-primary/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-pink/15 dark:bg-accent-pink/8 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent-teal/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-accent-coral/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Main Card */}
        <div className="glass-card p-8 shadow-xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-16 h-16 nebula-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow"
            >
              <span className="text-2xl font-extrabold text-white">S</span>
            </motion.div>
            <h1 className="text-2xl font-extrabold gradient-text mb-1">Social Hub</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Connect, share, and discover</p>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'email' ? (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit}
                className="space-y-3"
              >
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="input-field w-full text-sm" placeholder="Email address"
                />
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    className="input-field w-full pr-10 text-sm" placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary dark:hover:text-primary-dark transition-colors">
                    {showPass ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Log In'}
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {phoneStep === 'number' ? (
                  <form onSubmit={handlePhoneLogin} className="space-y-3">
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                      className="input-field w-full text-sm" placeholder="Phone number (+1234567890)"
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit" disabled={loading}
                      className="btn-primary w-full py-3 text-sm disabled:opacity-50"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </motion.button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      OTP sent to <span className="font-semibold text-gray-800 dark:text-gray-100">{phone}</span>
                    </p>
                    <input
                      type="text" value={otp} onChange={e => setOtp(e.target.value)} required
                      className="input-field w-full text-sm text-center tracking-[0.3em]" placeholder="Enter 6-digit OTP"
                      maxLength={6} autoFocus
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit" disabled={loading}
                      className="btn-primary w-full py-3 text-sm disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify & Log In'}
                    </motion.button>
                    <button type="button" onClick={() => { setPhoneStep('number'); setOtp(''); }}
                      className="w-full text-xs text-primary dark:text-primary-dark hover:underline">
                      Change number
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
          </div>

          {/* Google Login */}
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google login failed')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              width="300"
            />
          </div>

          {/* Toggle auth mode */}
          <button
            onClick={() => setAuthMode(authMode === 'email' ? 'phone' : 'email')}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-primary dark:text-primary-dark hover:opacity-80 transition-opacity"
          >
            {authMode === 'email' ? (
              <><HiDevicePhoneMobile className="w-4 h-4" /> Log in with phone</>
            ) : (
              <><HiEnvelope className="w-4 h-4" /> Log in with email</>
            )}
          </button>
        </div>

        {/* Sign up link */}
        <div className="glass-card p-5 mt-3 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary dark:text-primary-dark font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>

      <div ref={recaptchaRef} id="recaptcha-container"></div>
    </div>
  );
};

export default Login;
