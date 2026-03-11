const Song = require('../models/Song');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const User = require('../models/User');

exports.uploadSong = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio file provided' });
    const { title, artist, album, genre, duration } = req.body;
    const song = await Song.create({
      title: title || 'Untitled',
      artist, album, genre,
      duration: duration ? parseFloat(duration) : 0,
      audioUrl: req.file.path,
      cloudinaryId: req.file.filename,
      coverArt: req.body.coverArt || '',
      uploadedBy: req.user._id,
    });
    // Auto-create feed post
    await Post.create({
      user: req.user._id,
      text: (song.title || 'Untitled') + (song.artist ? ' by ' + song.artist : ''),
      songUrl: song.audioUrl,
      songTitle: song.title || 'Untitled',
      type: 'music',
    });
    res.status(201).json(song);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getSongs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, user } = req.query;
    const query = {};
    if (search) query.$text = { $search: search };
    if (user) query.uploadedBy = user;
    const songs = await Song.find(query)
      .populate('uploadedBy', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Song.countDocuments(query);
    res.json({ songs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMySongs = async (req, res) => {
  try {
    const songs = await Song.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likeSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found' });
    const idx = song.likes.indexOf(req.user._id);
    if (idx > -1) { song.likes.splice(idx, 1); }
    else {
      song.likes.push(req.user._id);
      if (song.uploadedBy.toString() !== req.user._id.toString()) {
        const io = req.app.get('io');
        const sendNotification = require('../utils/sendNotification');
        await sendNotification(io, {
          recipient: song.uploadedBy, sender: req.user._id,
          type: 'song_like', content: `${req.user.name} liked your song "${song.title}"`,
          referenceId: song._id, referenceModel: 'Song',
        });
      }
    }
    await song.save();
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.favoriteSong = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.favoriteSongs.indexOf(req.params.id);
    if (idx > -1) user.favoriteSongs.splice(idx, 1);
    else user.favoriteSongs.push(req.params.id);
    await user.save();
    res.json(user.favoriteSongs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.playSong = async (req, res) => {
  try {
    await Song.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } });
    res.json({ message: 'Play count updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found' });
    if (song.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await song.deleteOne();
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
