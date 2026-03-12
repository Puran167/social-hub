const Razorpay = require('razorpay');
const crypto = require('crypto');
const PageProduct = require('../models/PageProduct');
const PageOrder = require('../models/PageOrder');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
exports.createOrder = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await PageProduct.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const qty = Math.max(1, parseInt(quantity) || 1);
    const amount = product.price * qty * 100; // Razorpay expects paise

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: 'Payment order creation failed', error: err.message });
  }
};

// Verify payment and create order
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      productId,
      fullName, phone, address, city, pincode, note, quantity,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Payment verified — create order
    const product = await PageProduct.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const qty = Math.max(1, parseInt(quantity) || 1);
    const order = await PageOrder.create({
      page: product.page,
      product: product._id,
      buyer: req.user._id,
      quantity: qty,
      totalPrice: product.price * qty,
      shippingInfo: { fullName, phone, address, city: city || '', pincode: pincode || '' },
      note: note || '',
      paymentInfo: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
      },
    });

    const populated = await PageOrder.findById(order._id)
      .populate('buyer', 'name avatar')
      .populate('product', 'productName price productImage');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Payment verification failed', error: err.message });
  }
};
