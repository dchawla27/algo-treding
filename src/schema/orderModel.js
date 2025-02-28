const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderid: String,
  uniqueorderid: String,
  type: String,
  date: String,
  instrument: String,
  price: Number,
  qty: Number,
  exchange: String,
  symboltoken: String,
  strikeprice: String,
  optiontype: String,
  expirydate: String,
  orderStatus: String,
  description: String,
  superTrendValue: Number,
  instrumentPrice: Number
});

module.exports = mongoose.model('Orders', orderSchema);
