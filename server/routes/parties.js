const router = require('express').Router();
const ctrl = require('../controllers/partyController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.createParty);
router.get('/', auth, ctrl.getMyParties);
router.get('/:id', auth, ctrl.getParty);
router.post('/join/:code', auth, ctrl.joinByCode);
router.put('/:id/media', auth, ctrl.updateMedia);
router.post('/:id/queue', auth, ctrl.addToQueue);
router.put('/:id/end', auth, ctrl.endParty);
router.put('/:id/leave', auth, ctrl.leaveParty);

module.exports = router;
