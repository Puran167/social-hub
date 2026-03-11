const Story = require('../models/Story');
const Notification = require('../models/Notification');
const User = require('../models/User');

exports.createStory = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No media file provided' });
    const story = await Story.create({
      user: req.user._id,
      type: req.body.type || 'photo',
      mediaUrl: req.file.path,
      cloudinaryId: req.file.filename,
      caption: req.body.caption || '',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getStories = async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'name profilePhoto')
      .populate('viewers.user', 'name profilePhoto')
      .sort({ createdAt: -1 });
    // Group by user
    const grouped = {};
    stories.forEach(s => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: s.user, stories: [] };
      grouped[uid].stories.push(s);
    });
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    const alreadyViewed = story.viewers.some(v => v.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      story.viewers.push({ user: req.user._id });
      await story.save();
      if (story.user.toString() !== req.user._id.toString()) {
        const io = req.app.get('io');
        const sendNotification = require('../utils/sendNotification');
        await sendNotification(io, {
          recipient: story.user, sender: req.user._id,
          type: 'story_view', content: `${req.user.name} viewed your story`,
        });
      }
    }
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await story.deleteOne();
    res.json({ message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addToHighlights = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story || story.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Story not found' });
    }
    story.isHighlight = true;
    story.highlightName = req.body.highlightName || 'Highlight';
    story.expiresAt = new Date('2099-12-31');
    await story.save();
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getHighlights = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const highlights = await Story.find({ user: userId, isHighlight: true })
      .populate('user', 'name profilePhoto');
    const grouped = {};
    highlights.forEach(h => {
      const name = h.highlightName;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(h);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
