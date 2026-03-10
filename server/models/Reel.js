const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl: { type: String, required: true },
  cloudinaryId: { type: String },
  caption: { type: String, default: '', maxlength: 300 },
  musicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
  musicTitle: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  }],
  shares: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Reel', reelSchema);
