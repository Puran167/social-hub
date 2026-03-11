const mongoose = require('mongoose');

const pagePlaylistSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  title: { type: String, required: true },
  songs: [{ type: String }],
  coverArt: { type: String, default: '' },
}, { timestamps: true });

pagePlaylistSchema.index({ page: 1 });

module.exports = mongoose.model('PagePlaylist', pagePlaylistSchema);
