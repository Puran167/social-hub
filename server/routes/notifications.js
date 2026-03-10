const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getNotifications);
router.put('/read/:id', auth, ctrl.markAsRead);
router.put('/read-all', auth, ctrl.markAllAsRead);
router.delete('/:id', auth, ctrl.deleteNotification);

module.exports = router;
