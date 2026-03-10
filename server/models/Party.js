const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String, unique: true },
  currentMedia: {
    type: { type: String, enum: ['song', 'video'], default: 'song' },
    mediaId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, default: '' },
    artist: { type: String, default: '' },
    url: { type: String, default: '' },
    coverArt: { type: String, default: '' },
    duration: { type: Number, default: 0 },
  },
  playbackState: {
    isPlaying: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  queue: [{
    type: { type: String, enum: ['song', 'video'], default: 'song' },
    mediaId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String },
    artist: { type: String },
    url: { type: String },
    coverArt: { type: String },
    duration: { type: Number, default: 0 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  chat: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String },
    senderPhoto: { type: String },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
  maxParticipants: { type: Number, default: 20 },
}, { timestamps: true });

partySchema.index({ inviteCode: 1 });
partySchema.index({ host: 1, isActive: 1 });

module.exports = mongoose.model('Party', partySchema);
