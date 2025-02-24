const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  type: String,
  date: String,
  instrument: String,
  price: Number,
  superTrendValue: Number,
  qty: Number,
  orderStatus: String,
  description: String,
});

module.exports = mongoose.model('Orders', orderSchema);
