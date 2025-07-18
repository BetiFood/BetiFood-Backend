const mongoose = require('mongoose');
const DonationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  toCook: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: false },
  toOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  message: { type: String },
  extra: { type: Number, default: 0 },
  extraTo: { type: String, enum: ['cook', 'delivery', 'split'], default: 'cook' },
  extraToCook: { type: Number, default: 0 },
  extraToDelivery: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Donation', DonationSchema); 