const router = require('express').Router();
const ctrl = require('../controllers/sessionController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getActiveSessions);
router.delete('/:id', auth, ctrl.revokeSession);
router.delete('/', auth, ctrl.revokeAllOtherSessions);

module.exports = router;
