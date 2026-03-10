const router = require('express').Router();
const ctrl = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/search', auth, ctrl.searchUsers);
router.get('/suggested', auth, ctrl.getSuggestedFriends);
router.get('/:id', auth, ctrl.getUserProfile);

module.exports = router;
