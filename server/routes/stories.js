const router = require('express').Router();
const ctrl = require('../controllers/storyController');
const auth = require('../middleware/auth');
const { imageUpload, videoUpload } = require('../middleware/upload');
const multer = require('multer');

// Use a general upload that accepts both image and video
const storyUpload = multer({
  storage: require('multer-storage-cloudinary').CloudinaryStorage
    ? new (require('multer-storage-cloudinary').CloudinaryStorage)({
        cloudinary: require('../config/cloudinary'),
        params: { folder: 'personal-social-hub/stories', resource_type: 'auto' },
      })
    : multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/', auth, storyUpload.single('media'), ctrl.createStory);
router.get('/', auth, ctrl.getStories);
router.put('/view/:id', auth, ctrl.viewStory);
router.put('/highlight/:id', auth, ctrl.addToHighlights);
router.get('/highlights/:userId', auth, ctrl.getHighlights);
router.delete('/:id', auth, ctrl.deleteStory);

module.exports = router;
