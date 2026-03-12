const router = require('express').Router();
const auth = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);

module.exports = router;
