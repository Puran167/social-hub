const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  groupPhoto: { type: String },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
