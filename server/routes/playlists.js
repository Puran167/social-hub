const router = require('express').Router();
const ctrl = require('../controllers/playlistController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.createPlaylist);
router.get('/', auth, ctrl.getMyPlaylists);
router.get('/:id', auth, ctrl.getPlaylist);
router.put('/:id/add-song', auth, ctrl.addSongToPlaylist);
router.put('/:id/remove-song', auth, ctrl.removeSongFromPlaylist);
router.put('/:id/invite', auth, ctrl.inviteCollaborator);
router.delete('/:id', auth, ctrl.deletePlaylist);

module.exports = router;
