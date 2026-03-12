const mongoose = require('mongoose');

const pageOrderSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'PageProduct', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  totalPrice: { type: Number, required: true },
  shippingInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  note: { type: String, default: '' },
  paymentInfo: {
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  },
}, { timestamps: true });

pageOrderSchema.index({ page: 1, createdAt: -1 });
pageOrderSchema.index({ buyer: 1, createdAt: -1 });

module.exports = mongoose.model('PageOrder', pageOrderSchema);
