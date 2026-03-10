const router = require('express').Router();
const ctrl = require('../controllers/postController');
const auth = require('../middleware/auth');
const { postMediaUpload } = require('../middleware/upload');
const multer = require('multer');

// Multi-field upload: image + video + audio (uses generic storage that accepts all media types)
const postUpload = multer({
  storage: postMediaUpload.storage,
  limits: { fileSize: 100 * 1024 * 1024 },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

const handlePostUpload = (req, res, next) => {
  postUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Upload error: ' + err.message });
    }
    if (err) {
      return res.status(500).json({ message: 'Upload failed: ' + err.message });
    }
    next();
  });
};

router.get('/feed', auth, ctrl.getFeed);
router.get('/user/:userId', auth, ctrl.getUserPosts);
router.get('/:id', auth, ctrl.getPost);
router.post('/', auth, handlePostUpload, ctrl.createPost);
router.put('/:id', auth, handlePostUpload, ctrl.updatePost);
router.delete('/:id', auth, ctrl.deletePost);
router.put('/:id/like', auth, ctrl.toggleLike);
router.post('/:id/comments', auth, ctrl.addComment);
router.delete('/:id/comments/:commentId', auth, ctrl.deleteComment);

module.exports = router;
