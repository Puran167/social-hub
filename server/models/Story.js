const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['photo', 'video'], required: true },
  mediaUrl: { type: String, required: true },
  cloudinaryId: { type: String },
  caption: { type: String, default: '', maxlength: 200 },
  viewers: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, viewedAt: { type: Date, default: Date.now } }],
  isHighlight: { type: Boolean, default: false },
  highlightName: { type: String },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
