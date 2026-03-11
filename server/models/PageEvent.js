const mongoose = require('mongoose');

const pageEventSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  eventDate: { type: Date, required: true },
  coverImage: { type: String, default: '' },
  eventLink: { type: String, default: '' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

pageEventSchema.index({ page: 1, eventDate: 1 });

module.exports = mongoose.model('PageEvent', pageEventSchema);
