const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  cloudinaryId: { type: String },
  caption: { type: String, default: '', maxlength: 500 },
  album: { type: String, default: 'General' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  }],
  tags: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Photo', photoSchema);
