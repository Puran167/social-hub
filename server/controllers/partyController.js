const crypto = require('crypto');
const Party = require('../models/Party');
const User = require('../models/User');

const generateInviteCode = () => crypto.randomBytes(4).toString('hex');

exports.createParty = async (req, res) => {
  try {
    const { name, mediaType, mediaId, title, artist, url, coverArt, duration } = req.body;
    const party = await Party.create({
      name: name || `${req.user.name}'s Party`,
      host: req.user._id,
      participants: [req.user._id],
      inviteCode: generateInviteCode(),
      currentMedia: {
        type: mediaType || 'song',
        mediaId: mediaId || null,
        title: title || '',
        artist: artist || '',
        url: url || '',
        coverArt: coverArt || '',
        duration: duration || 0,
      },
    });
    const populated = await Party.findById(party._id)
      .populate('host', 'name profilePhoto')
      .populate('participants', 'name profilePhoto isOnline');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyParties = async (req, res) => {
  try {
    const parties = await Party.find({
      $or: [{ host: req.user._id }, { participants: req.user._id }],
      isActive: true,
    })
      .populate('host', 'name profilePhoto')
      .populate('participants', 'name profilePhoto isOnline')
      .sort({ updatedAt: -1 });
    res.json(parties);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id)
      .populate('host', 'name profilePhoto')
      .populate('participants', 'name profilePhoto isOnline')
      .populate('queue.addedBy', 'name profilePhoto');
    if (!party) return res.status(404).json({ message: 'Party not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.joinByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const party = await Party.findOne({ inviteCode: code, isActive: true });
    if (!party) return res.status(404).json({ message: 'Party not found or inactive' });
    if (party.participants.length >= party.maxParticipants) {
      return res.status(400).json({ message: 'Party is full' });
    }
    if (!party.participants.some(p => p.toString() === req.user._id.toString())) {
      party.participants.push(req.user._id);
      await party.save();
    }
    const populated = await Party.findById(party._id)
      .populate('host', 'name profilePhoto')
      .populate('participants', 'name profilePhoto isOnline');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateMedia = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    if (party.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can change media' });
    }
    const { mediaType, mediaId, title, artist, url, coverArt, duration } = req.body;
    party.currentMedia = {
      type: mediaType || 'song', mediaId, title, artist, url, coverArt, duration: duration || 0,
    };
    party.playbackState = { isPlaying: true, currentTime: 0, updatedAt: new Date() };
    await party.save();

    const io = req.app.get('io');
    io.to(`party-${party._id}`).emit('party-media-changed', {
      currentMedia: party.currentMedia,
      playbackState: party.playbackState,
    });
    res.json(party);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addToQueue = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    const { mediaType, mediaId, title, artist, url, coverArt, duration } = req.body;
    party.queue.push({
      type: mediaType || 'song', mediaId, title, artist, url, coverArt, duration: duration || 0,
      addedBy: req.user._id,
    });
    await party.save();
    const io = req.app.get('io');
    io.to(`party-${party._id}`).emit('party-queue-updated', party.queue);
    res.json(party.queue);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.endParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    if (party.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only host can end party' });
    }
    party.isActive = false;
    await party.save();
    const io = req.app.get('io');
    io.to(`party-${party._id}`).emit('party-ended');
    res.json({ message: 'Party ended' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.leaveParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ message: 'Party not found' });
    party.participants = party.participants.filter(p => p.toString() !== req.user._id.toString());
    await party.save();
    const io = req.app.get('io');
    io.to(`party-${party._id}`).emit('party-user-left', { userId: req.user._id, name: req.user.name });
    res.json({ message: 'Left party' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
