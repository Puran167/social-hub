const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  artist: { type: String, default: 'Unknown Artist', trim: true },
  album: { type: String, default: '', trim: true },
  genre: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  audioUrl: { type: String, required: true },
  coverArt: { type: String, default: '' },
  cloudinaryId: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  plays: { type: Number, default: 0 },
  isAIGenerated: { type: Boolean, default: false },
  aiPrompt: { type: String },
}, { timestamps: true });

songSchema.index({ title: 'text', artist: 'text', album: 'text' });

module.exports = mongoose.model('Song', songSchema);
