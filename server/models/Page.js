const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  pageName: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Music', 'Creator', 'Brand', 'Community', 'Education'], required: true },
  profilePhoto: { type: String, default: '' },
  coverPhoto: { type: String, default: '' },
  description: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Owner', 'Admin', 'Moderator'], default: 'Admin' },
  }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  verified: { type: Boolean, default: false },
}, { timestamps: true });

pageSchema.index({ creator: 1 });
pageSchema.index({ category: 1 });
pageSchema.index({ pageName: 'text', description: 'text' });

module.exports = mongoose.model('Page', pageSchema);
