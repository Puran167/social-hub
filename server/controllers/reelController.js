const Reel = require('../models/Reel');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

exports.createReel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file provided' });
    const reel = await Reel.create({
      user: req.user._id,
      videoUrl: req.file.path,
      cloudinaryId: req.file.filename,
      caption: req.body.caption || '',
      musicId: req.body.musicId || null,
      musicTitle: req.body.musicTitle || '',
    });
    // Auto-create feed post
    await Post.create({
      user: req.user._id,
      text: reel.caption || '',
      videoUrl: reel.videoUrl,
      type: 'video',
    });
    res.status(201).json(reel);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getReels = async (req, res) => {
  try {
    const { page = 1, limit = 10, user } = req.query;
    const query = {};
    if (user) query.user = user;
    const reels = await Reel.find(query)
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(reels);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likeReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });
    const idx = reel.likes.indexOf(req.user._id);
    if (idx > -1) reel.likes.splice(idx, 1);
    else {
      reel.likes.push(req.user._id);
      if (reel.user.toString() !== req.user._id.toString()) {
        const io = req.app.get('io');
        const sendNotification = require('../utils/sendNotification');
        await sendNotification(io, {
          recipient: reel.user, sender: req.user._id,
          type: 'reel_like', content: `${req.user.name} liked your reel`,
          referenceId: reel._id, referenceModel: 'Reel',
        });
      }
    }
    await reel.save();
    res.json(reel);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.commentReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });
    reel.comments.push({ user: req.user._id, text: req.body.text });
    await reel.save();
    const updated = await Reel.findById(reel._id)
      .populate('user', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.viewReel = async (req, res) => {
  try {
    await Reel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ message: 'View counted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });
    if (reel.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await reel.deleteOne();
    res.json({ message: 'Reel deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
