const mongoose = require('mongoose');

const pageStorySchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  cloudinaryId: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

pageStorySchema.index({ page: 1, expiresAt: 1 });
pageStorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PageStory', pageStorySchema);
