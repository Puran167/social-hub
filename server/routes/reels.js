const router = require('express').Router();
const ctrl = require('../controllers/reelController');
const auth = require('../middleware/auth');
const { videoUpload } = require('../middleware/upload');

router.post('/', auth, videoUpload.single('video'), ctrl.createReel);
router.get('/', auth, ctrl.getReels);
router.put('/like/:id', auth, ctrl.likeReel);
router.post('/comment/:id', auth, ctrl.commentReel);
router.put('/view/:id', auth, ctrl.viewReel);
router.delete('/:id', auth, ctrl.deleteReel);

module.exports = router;
