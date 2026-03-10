const Session = require('../models/Session');

exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, isActive: true })
      .sort({ lastActive: -1 });
    // Mark current session
    const currentToken = req.headers.authorization?.split(' ')[1];
    const result = sessions.map(s => ({
      _id: s._id,
      device: s.device,
      ipAddress: s.ipAddress,
      loginTime: s.loginTime,
      lastActive: s.lastActive,
      isCurrent: s.token === currentToken,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Session not found' });
    }
    session.isActive = false;
    await session.save();
    res.json({ message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.revokeAllOtherSessions = async (req, res) => {
  try {
    const currentToken = req.headers.authorization?.split(' ')[1];
    await Session.updateMany(
      { userId: req.user._id, token: { $ne: currentToken }, isActive: true },
      { isActive: false }
    );
    res.json({ message: 'All other sessions revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
