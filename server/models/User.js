const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6 },
  phone: { type: String },
  bio: { type: String, default: '', maxlength: 300 },
  profilePhoto: { type: String, default: '' },
  coverPhoto: { type: String, default: '' },
  googleId: { type: String },
  authProvider: { type: String, enum: ['local', 'google', 'phone'], default: 'local' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  favoriteSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String },
  darkMode: { type: Boolean, default: true },
  notificationsEnabled: { type: Boolean, default: true },
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    showOnlineStatus: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
