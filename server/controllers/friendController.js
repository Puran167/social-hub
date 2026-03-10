const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.sendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (toUserId === req.user._id.toString()) return res.status(400).json({ message: 'Cannot send request to yourself' });
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user._id, to: toUserId },
        { from: toUserId, to: req.user._id },
      ],
    });
    if (existing) return res.status(400).json({ message: 'Request already exists' });
    const request = await FriendRequest.create({ from: req.user._id, to: toUserId });
    const io = req.app.get('io');
    const sendNotification = require('../utils/sendNotification');
    await sendNotification(io, {
      recipient: toUserId, sender: req.user._id,
      type: 'friend_request', content: `${req.user.name} sent you a friend request`,
      referenceId: request._id, referenceModel: 'FriendRequest',
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request || request.to.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Request not found' });
    }
    request.status = 'accepted';
    await request.save();
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    const io = req.app.get('io');
    const sendNotification = require('../utils/sendNotification');
    await sendNotification(io, {
      recipient: request.from, sender: req.user._id,
      type: 'friend_accepted', content: `${req.user.name} accepted your friend request`,
    });
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request || request.to.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Request not found' });
    }
    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'name profilePhoto');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name profilePhoto bio isOnline lastSeen');
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
