const mongoose = require('mongoose');

const pageMessageSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isFromPage: { type: Boolean, default: false },
}, { timestamps: true });

pageMessageSchema.index({ page: 1, sender: 1, createdAt: -1 });

module.exports = mongoose.model('PageMessage', pageMessageSchema);
