const Playlist = require('../models/Playlist');
const Notification = require('../models/Notification');

exports.createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic, isCollaborative } = req.body;
    const playlist = await Playlist.create({
      name, description, isPublic, isCollaborative,
      owner: req.user._id,
      coverImage: req.body.coverImage || '',
    });
    res.status(201).json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    }).populate('songs').populate('owner', 'name profilePhoto').populate('collaborators', 'name profilePhoto');
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('songs')
      .populate('owner', 'name profilePhoto')
      .populate('collaborators', 'name profilePhoto');
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addSongToPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    const isAllowed = playlist.owner.toString() === req.user._id.toString() ||
      playlist.collaborators.some(c => c.toString() === req.user._id.toString());
    if (!isAllowed) return res.status(403).json({ message: 'Not authorized' });
    playlist.songs.addToSet(req.body.songId);
    await playlist.save();
    const io = req.app.get('io');
    io.to(`playlist-${playlist._id}`).emit('playlist-updated', playlist);
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeSongFromPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    const isAllowed = playlist.owner.toString() === req.user._id.toString() ||
      playlist.collaborators.some(c => c.toString() === req.user._id.toString());
    if (!isAllowed) return res.status(403).json({ message: 'Not authorized' });
    playlist.songs.pull(req.body.songId);
    await playlist.save();
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.inviteCollaborator = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    if (playlist.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only owner can invite' });
    playlist.collaborators.addToSet(req.body.userId);
    await playlist.save();
    const io = req.app.get('io');
    const sendNotification = require('../utils/sendNotification');
    await sendNotification(io, {
      recipient: req.body.userId, sender: req.user._id,
      type: 'playlist_invite', content: `${req.user.name} invited you to collaborate on "${playlist.name}"`,
      referenceId: playlist._id, referenceModel: 'Playlist',
    });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deletePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
    if (playlist.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await playlist.deleteOne();
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
