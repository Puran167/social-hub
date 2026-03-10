const router = require('express').Router();
const { body } = require('express-validator');
const passport = require('../config/passport');
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ characters'),
], ctrl.register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], ctrl.login);

// Google OAuth - token verification from @react-oauth/google
router.post('/google', ctrl.googleLogin);

// Google OAuth - Passport.js redirect flow
router.get('/google/redirect', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), ctrl.googleCallback);

// Phone OTP via Firebase
router.post('/phone', ctrl.phoneLogin);

router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, imageUpload.single('profilePhoto'), ctrl.updateProfile);
router.put('/password', auth, ctrl.changePassword);

module.exports = router;
