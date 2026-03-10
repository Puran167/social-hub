const router = require('express').Router();
const ctrl = require('../controllers/friendController');
const auth = require('../middleware/auth');

router.post('/request', auth, ctrl.sendRequest);
router.put('/accept/:id', auth, ctrl.acceptRequest);
router.put('/reject/:id', auth, ctrl.rejectRequest);
router.get('/pending', auth, ctrl.getPendingRequests);
router.get('/', auth, ctrl.getFriends);
router.delete('/:friendId', auth, ctrl.removeFriend);

module.exports = router;
