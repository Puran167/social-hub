const mongoose = require('mongoose');

const pagePostSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'photo', 'reel', 'music'], default: 'text' },
  caption: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  cloudinaryId: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

pagePostSchema.index({ page: 1, createdAt: -1 });

module.exports = mongoose.model('PagePost', pagePostSchema);
