const router = require('express').Router();
const ctrl = require('../controllers/songController');
const auth = require('../middleware/auth');
const { audioUpload } = require('../middleware/upload');

router.post('/', auth, audioUpload.single('audio'), ctrl.uploadSong);
router.get('/', auth, ctrl.getSongs);
router.get('/my', auth, ctrl.getMySongs);
router.put('/like/:id', auth, ctrl.likeSong);
router.put('/favorite/:id', auth, ctrl.favoriteSong);
router.put('/play/:id', auth, ctrl.playSong);
router.delete('/:id', auth, ctrl.deleteSong);

module.exports = router;
