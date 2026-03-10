const Video = require('../models/Video');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file provided' });
    const video = await Video.create({
      title: req.body.title || 'Untitled Video',
      description: req.body.description || '',
      videoUrl: req.file.path,
      cloudinaryId: req.file.filename,
      thumbnailUrl: req.body.thumbnailUrl || '',
      duration: req.body.duration ? parseFloat(req.body.duration) : 0,
      uploadedBy: req.user._id,
      playlist: req.body.playlist || '',
    });
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = search ? { $text: { $search: search } } : {};
    const videos = await Video.find(query)
      .populate('uploadedBy', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Video.countDocuments(query);
    res.json({ videos, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyVideos = async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likeVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    const idx = video.likes.indexOf(req.user._id);
    if (idx > -1) video.likes.splice(idx, 1);
    else video.likes.push(req.user._id);
    await video.save();
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.commentVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    video.comments.push({ user: req.user._id, text: req.body.text });
    await video.save();
    const updated = await Video.findById(video._id)
      .populate('comments.user', 'name profilePhoto')
      .populate('uploadedBy', 'name profilePhoto');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.viewVideo = async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ message: 'View count updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    if (video.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await video.deleteOne();
    res.json({ message: 'Video deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
