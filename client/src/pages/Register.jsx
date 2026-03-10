import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse);
      toast.success('Welcome!');
      navigate('/');
    } catch (err) {
      toast.error('Google sign up failed');
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-bg flex items-center justify-center p-4 transition-colors relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-pink/15 dark:bg-accent-pink/8 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/15 dark:bg-primary/8 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-accent-teal/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="glass-card p-8 shadow-xl">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-16 h-16 nebula-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow"
            >
              <span className="text-2xl font-extrabold text-white">S</span>
            </motion.div>
            <h1 className="text-2xl font-extrabold gradient-text mb-1">Social Hub</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sign up to see photos, music, and stories from friends</p>
          </div>

          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign up failed')}
              theme="outline"
              size="large"
              text="signup_with"
              shape="pill"
              width="300"
            />
          </div>

          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              className="input-field w-full text-sm" placeholder="Full Name"
            />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="input-field w-full text-sm" placeholder="Email address"
            />
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6}
                className="input-field w-full pr-10 text-sm" placeholder="Password (min 6 chars)"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary dark:hover:text-primary-dark transition-colors">
                {showPass ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
            <input
              type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              className="input-field w-full text-sm" placeholder="Confirm password"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </motion.button>
          </form>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 leading-relaxed">
            By signing up, you agree to our Terms, Privacy Policy, and Cookies Policy.
          </p>
        </div>

        <div className="glass-card p-5 mt-3 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Have an account?{' '}
            <Link to="/login" className="text-primary dark:text-primary-dark font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
