const mongoose = require('mongoose');
const momentTz = require("moment-timezone");
const { TIMEZONE } = require('../config');

const getISTTime = () => {
  return momentTz().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
};

const algotrendSchema = new mongoose.Schema({
  createdAt: { type: String, default: getISTTime },
  superTrendValue: Number,
  superTrendDirection: String

});

module.exports = mongoose.model('Algotrend', algotrendSchema);
