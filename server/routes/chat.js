const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const auth = require('../middleware/auth');
const { chatUpload } = require('../middleware/upload');
const multer = require('multer');

// Wrapper to catch multer/Cloudinary upload errors and return proper JSON
const handleUpload = (req, res, next) => {
  chatUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Upload error: ' + err.message });
    }
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).json({ message: 'File upload failed: ' + err.message });
    }
    next();
  });
};

router.get('/conversations', auth, ctrl.getConversations);
router.post('/conversations', auth, ctrl.getOrCreateConversation);
router.get('/messages/:conversationId', auth, ctrl.getMessages);
router.post('/messages', auth, handleUpload, ctrl.sendMessage);
router.put('/read/:conversationId', auth, ctrl.markAsRead);

// Group chat
router.post('/groups', auth, ctrl.createGroup);
const { imageUpload } = require('../middleware/upload');
const handleGroupPhoto = (req, res, next) => {
  imageUpload.single('groupPhoto')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Upload error: ' + err.message });
    }
    if (err) {
      return res.status(500).json({ message: 'Photo upload failed: ' + err.message });
    }
    next();
  });
};
router.put('/groups/:id', auth, handleGroupPhoto, ctrl.updateGroup);
router.post('/groups/:id/members', auth, ctrl.addGroupMember);
router.delete('/groups/:id/members', auth, ctrl.removeGroupMember);
router.put('/groups/:id/leave', auth, ctrl.leaveGroup);

// Reactions
router.post('/messages/:messageId/react', auth, ctrl.reactToMessage);

module.exports = router;
