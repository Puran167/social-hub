const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    let filter = { _id: { $ne: req.user._id } };
    if (query) {
      filter = {
        $and: [
          { _id: { $ne: req.user._id } },
          { $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ]},
        ],
      };
    }
    const users = await User.find(filter)
      .select('name email profilePhoto bio isOnline')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getSuggestedFriends = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('friends');
    const friendIds = currentUser.friends || [];
    const excludeIds = [req.user._id, ...friendIds];

    // Get friends of friends (mutual connections)
    let suggestions = [];
    if (friendIds.length > 0) {
      const friendsOfFriends = await User.find({
        _id: { $nin: excludeIds },
        friends: { $in: friendIds },
      })
        .select('name email profilePhoto bio isOnline friends')
        .limit(10);
      suggestions = friendsOfFriends.map(u => ({
        _id: u._id, name: u.name, email: u.email,
        profilePhoto: u.profilePhoto, bio: u.bio, isOnline: u.isOnline,
        mutualFriends: u.friends.filter(f => friendIds.some(fid => fid.toString() === f.toString())).length,
      }));
    }

    // Fill remaining with random users if not enough suggestions
    if (suggestions.length < 10) {
      const existingIds = [...excludeIds, ...suggestions.map(s => s._id)];
      const random = await User.find({ _id: { $nin: existingIds } })
        .select('name email profilePhoto bio isOnline')
        .limit(10 - suggestions.length);
      suggestions.push(...random.map(u => ({
        _id: u._id, name: u.name, email: u.email,
        profilePhoto: u.profilePhoto, bio: u.bio, isOnline: u.isOnline,
        mutualFriends: 0,
      })));
    }

    // Sort: most mutual friends first
    suggestions.sort((a, b) => b.mutualFriends - a.mutualFriends);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('friends', 'name profilePhoto isOnline')
      .populate('favoriteSongs');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
