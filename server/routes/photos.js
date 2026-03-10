const router = require('express').Router();
const ctrl = require('../controllers/photoController');
const auth = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');

router.post('/', auth, imageUpload.single('photo'), ctrl.uploadPhoto);
router.get('/', auth, ctrl.getPhotos);
router.get('/my', auth, ctrl.getMyPhotos);
router.get('/user/:userId', auth, ctrl.getUserPhotos);
router.put('/like/:id', auth, ctrl.likePhoto);
router.post('/comment/:id', auth, ctrl.commentPhoto);
router.delete('/:id', auth, ctrl.deletePhoto);

module.exports = router;
