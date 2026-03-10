const Notification = require('../models/Notification');

/**
 * Create a notification and emit it in real-time via Socket.io.
 * @param {object} io - Socket.io server instance
 * @param {object} opts - Notification options
 * @param {string} opts.recipient - Recipient user ID
 * @param {string} opts.sender - Sender user ID
 * @param {string} opts.type - Notification type enum
 * @param {string} opts.content - Display text
 * @param {string} [opts.referenceId] - Related document ID
 * @param {string} [opts.referenceModel] - Related model name
 */
const sendNotification = async (io, { recipient, sender, type, content, referenceId, referenceModel }) => {
  // Don't notify yourself
  if (recipient.toString() === sender.toString()) return;

  try {
    const notif = await Notification.create({
      recipient, sender, type, content, referenceId, referenceModel,
    });

    const populated = await Notification.findById(notif._id)
      .populate('sender', 'name profilePhoto');

    // Emit to the recipient's personal room (they join their own userId room on connect)
    io.to(recipient.toString()).emit('notification', populated);
  } catch (err) {
    console.error('sendNotification error:', err.message);
  }
};

module.exports = sendNotification;
