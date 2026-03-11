const Photo = require('../models/Photo');
const Notification = require('../models/Notification');

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    const photo = await Photo.create({
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename,
      caption: req.body.caption || '',
      album: req.body.album || 'General',
      uploadedBy: req.user._id,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    });
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20, album, user } = req.query;
    const query = {};
    if (album) query.album = album;
    if (user) query.uploadedBy = user;
    const photos = await Photo.find(query)
      .populate('uploadedBy', 'name profilePhoto')
      .populate('comments.user', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Photo.countDocuments(query);
    res.json({ photos, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyPhotos = async (req, res) => {
  try {
    const photos = await Photo.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUserPhotos = async (req, res) => {
  try {
    const photos = await Photo.find({ uploadedBy: req.params.userId }).sort({ createdAt: -1 });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });
    const idx = photo.likes.indexOf(req.user._id);
    if (idx > -1) photo.likes.splice(idx, 1);
    else {
      photo.likes.push(req.user._id);
      if (photo.uploadedBy.toString() !== req.user._id.toString()) {
        const io = req.app.get('io');
        const sendNotification = require('../utils/sendNotification');
        await sendNotification(io, {
          recipient: photo.uploadedBy, sender: req.user._id,
          type: 'photo_like', content: `${req.user.name} liked your photo`,
          referenceId: photo._id, referenceModel: 'Photo',
        });
      }
    }
    await photo.save();
    res.json(photo);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.commentPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });
    photo.comments.push({ user: req.user._id, text: req.body.text });
    await photo.save();
    if (photo.uploadedBy.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      const sendNotification = require('../utils/sendNotification');
      await sendNotification(io, {
        recipient: photo.uploadedBy, sender: req.user._id,
        type: 'comment', content: `${req.user.name} commented on your photo`,
        referenceId: photo._id, referenceModel: 'Photo',
      });
    }
    const updated = await Photo.findById(photo._id)
      .populate('comments.user', 'name profilePhoto')
      .populate('uploadedBy', 'name profilePhoto');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });
    if (photo.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await photo.deleteOne();
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
