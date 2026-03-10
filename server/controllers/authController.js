const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Session = require('../models/Session');
const { verifyFirebaseToken } = require('../config/firebase');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const parseDevice = (ua) => {
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[/\s]([\d.]+)/i);
  const os = ua.match(/(Windows|Mac OS X|Linux|Android|iOS|iPhone)[\s/]?([\d._]*)/i);
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  return {
    type: deviceType,
    browser: browser ? browser[1] : 'Unknown',
    os: os ? os[1].replace(/_/g, '.') : 'Unknown',
  };
};

const createSession = async (userId, token, req) => {
  const ua = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  await Session.create({
    userId, token,
    device: parseDevice(ua),
    ipAddress: ip,
  });
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    await createSession(user._id, token, req);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    await createSession(user._id, token, req);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Google OAuth - verify credential token from frontend @react-oauth/google
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({ name, email, googleId, profilePhoto: picture || '', authProvider: 'google' });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.profilePhoto && picture) user.profilePhoto = picture;
      await user.save();
    }
    const token = generateToken(user._id);
    await createSession(user._id, token, req);
    res.json({ user, token });
  } catch (err) {
    console.error('Google auth error:', err.message, err.stack);
    res.status(401).json({ message: 'Google authentication failed', error: err.message });
  }
};

// Google OAuth Passport callback
exports.googleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    await createSession(req.user._id, token, req);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
};

// Firebase Phone OTP verification
exports.phoneLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) return res.status(400).json({ message: 'Firebase token required' });

    const decoded = await verifyFirebaseToken(firebaseToken);
    const phone = decoded.phone_number;
    if (!phone) return res.status(400).json({ message: 'Phone number not found in token' });

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        name: 'User',
        email: `${phone.replace(/\+/g, '')}@phone.local`,
        phone,
        authProvider: 'phone',
      });
    }
    const token = generateToken(user._id);
    await createSession(user._id, token, req);
    res.json({ user, token });
  } catch (err) {
    // Fallback for demo/dev mode without Firebase
    if (req.body.phone && !req.body.firebaseToken) {
      const { phone, name } = req.body;
      let user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ name: name || 'User', email: `${phone.replace(/\+/g, '')}@phone.local`, phone, authProvider: 'phone' });
      }
      const fallbackToken = generateToken(user._id);
      await createSession(user._id, fallbackToken, req);
      return res.json({ user, token: fallbackToken });
    }
    res.status(401).json({ message: 'Phone authentication failed', error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteSongs');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'bio', 'profilePhoto', 'coverPhoto', 'darkMode', 'notificationsEnabled', 'privacySettings'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.file) updates.profilePhoto = req.file.path;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (user.password && !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
