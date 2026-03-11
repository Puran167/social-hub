const mongoose = require('mongoose');

const pageProductSchema = new mongoose.Schema({
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  productImage: { type: String, default: '' },
  cloudinaryId: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });

pageProductSchema.index({ page: 1 });

module.exports = mongoose.model('PageProduct', pageProductSchema);
