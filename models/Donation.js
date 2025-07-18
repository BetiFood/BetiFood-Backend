const mongoose = require('mongoose');
const DonationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  toCook: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: false },
  toOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  toCharity: { type: mongoose.Schema.Types.ObjectId, ref: 'Charity', required: false },
  message: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'delivered'], default: 'pending' },
  adminNote: { type: String },
  proofImage: { type: String },
  logs: [{
    action: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    note: String
  }],
  extra: { type: Number, default: 0 },
  extraTo: { type: String, enum: ['cook', 'delivery', 'split'], default: 'cook' },
  extraToCook: { type: Number, default: 0 },
  extraToDelivery: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Donation', DonationSchema); 