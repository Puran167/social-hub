const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name profilePhoto isOnline lastSeen')
      .populate('admin', 'name profilePhoto')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    let convo = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    }).populate('participants', 'name profilePhoto isOnline lastSeen').populate('lastMessage');
    if (!convo) {
      convo = await Conversation.create({ participants: [req.user._id, userId] });
      convo = await convo.populate('participants', 'name profilePhoto isOnline lastSeen');
    }
    res.json(convo);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({
      conversationId: req.params.conversationId,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type } = req.body;
    const msgData = {
      conversationId,
      sender: req.user._id,
      type: type || 'text',
      content,
      readBy: [req.user._id],
    };
    if (req.file) {
      msgData.fileUrl = req.file.path;
      msgData.fileName = req.file.originalname;
      if (type === 'voice') msgData.voiceDuration = req.body.voiceDuration;
    }
    const message = await Message.create(msgData);
    await message.populate('sender', 'name profilePhoto');
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });
    const io = req.app.get('io');
    // Emit to chat room (for users who have this conversation open)
    io.to(`chat-${conversationId}`).emit('new-message', message);
    // Also emit to each participant's personal room so they get it even if
    // they haven't opened this conversation yet
    const convo = await Conversation.findById(conversationId);
    if (convo) {
      convo.participants.forEach(pid => {
        const participantId = pid.toString();
        if (participantId !== req.user._id.toString()) {
          io.to(participantId).emit('new-message', message);
        }
      });
    }
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { conversationId: req.params.conversationId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ---- GROUP CHAT ----

exports.createGroup = async (req, res) => {
  try {
    const { name, memberIds, groupPhoto } = req.body;
    if (!name || !memberIds || memberIds.length < 1) {
      return res.status(400).json({ message: 'Group name and at least 1 member required' });
    }
    const participants = [req.user._id, ...memberIds.filter(id => id !== req.user._id.toString())];
    const group = await Conversation.create({
      participants,
      isGroup: true,
      groupName: name,
      groupPhoto: groupPhoto || '',
      admin: req.user._id,
    });
    // System message
    await Message.create({
      conversationId: group._id,
      sender: req.user._id,
      type: 'system',
      content: `${req.user.name} created the group "${name}"`,
      readBy: [req.user._id],
    });
    const populated = await Conversation.findById(group._id)
      .populate('participants', 'name profilePhoto isOnline lastSeen')
      .populate('admin', 'name profilePhoto');
    const io = req.app.get('io');
    participants.forEach(pid => {
      io.to(pid.toString()).emit('new-group', populated);
    });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (convo.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can update group' });
    }
    const { groupName } = req.body;
    if (groupName) convo.groupName = groupName;
    if (req.file) {
      convo.groupPhoto = req.file.path;
    } else if (req.body.groupPhoto !== undefined) {
      convo.groupPhoto = req.body.groupPhoto;
    }
    await convo.save();
    const populated = await Conversation.findById(convo._id)
      .populate('participants', 'name profilePhoto isOnline lastSeen')
      .populate('admin', 'name profilePhoto')
      .populate('lastMessage');
    const io = req.app.get('io');
    populated.participants.forEach(p => {
      io.to(p._id.toString()).emit('group-updated', populated);
    });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addGroupMember = async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (convo.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }
    const { userId } = req.body;
    if (convo.participants.some(p => p.toString() === userId)) {
      return res.status(400).json({ message: 'User already in group' });
    }
    convo.participants.push(userId);
    await convo.save();
    const User = require('../models/User');
    const addedUser = await User.findById(userId).select('name');
    await Message.create({
      conversationId: convo._id, sender: req.user._id, type: 'system',
      content: `${req.user.name} added ${addedUser?.name || 'someone'} to the group`,
      readBy: [req.user._id],
    });
    const populated = await Conversation.findById(convo._id)
      .populate('participants', 'name profilePhoto isOnline lastSeen');
    const io = req.app.get('io');
    convo.participants.forEach(pid => io.to(pid.toString()).emit('group-updated', populated));
    io.to(userId).emit('new-group', populated);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeGroupMember = async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (convo.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }
    const { userId } = req.body;
    convo.participants = convo.participants.filter(p => p.toString() !== userId);
    await convo.save();
    const User = require('../models/User');
    const removedUser = await User.findById(userId).select('name');
    await Message.create({
      conversationId: convo._id, sender: req.user._id, type: 'system',
      content: `${req.user.name} removed ${removedUser?.name || 'someone'} from the group`,
      readBy: [req.user._id],
    });
    const populated = await Conversation.findById(convo._id)
      .populate('participants', 'name profilePhoto isOnline lastSeen');
    const io = req.app.get('io');
    convo.participants.forEach(pid => io.to(pid.toString()).emit('group-updated', populated));
    io.to(userId).emit('removed-from-group', { conversationId: convo._id });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    convo.participants = convo.participants.filter(p => p.toString() !== req.user._id.toString());
    // If admin left, assign new admin
    if (convo.admin.toString() === req.user._id.toString() && convo.participants.length > 0) {
      convo.admin = convo.participants[0];
    }
    await convo.save();
    await Message.create({
      conversationId: convo._id, sender: req.user._id, type: 'system',
      content: `${req.user.name} left the group`,
      readBy: [req.user._id],
    });
    const io = req.app.get('io');
    convo.participants.forEach(pid => io.to(pid.toString()).emit('group-member-left', { conversationId: convo._id, userId: req.user._id }));
    res.json({ message: 'Left group' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    const existingIdx = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );
    if (existingIdx > -1) {
      message.reactions.splice(existingIdx, 1);
    } else {
      message.reactions.push({ emoji, user: req.user._id });
    }
    await message.save();
    const io = req.app.get('io');
    io.to(`chat-${message.conversationId}`).emit('message-reaction', {
      messageId: message._id,
      reactions: message.reactions,
    });
    res.json({ reactions: message.reactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
