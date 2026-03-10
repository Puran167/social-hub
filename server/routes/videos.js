const router = require('express').Router();
const ctrl = require('../controllers/videoController');
const auth = require('../middleware/auth');
const { videoUpload } = require('../middleware/upload');

router.post('/', auth, videoUpload.single('video'), ctrl.uploadVideo);
router.get('/', auth, ctrl.getVideos);
router.get('/my', auth, ctrl.getMyVideos);
router.put('/like/:id', auth, ctrl.likeVideo);
router.post('/comment/:id', auth, ctrl.commentVideo);
router.put('/view/:id', auth, ctrl.viewVideo);
router.delete('/:id', auth, ctrl.deleteVideo);

module.exports = router;
