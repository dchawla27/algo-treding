const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  recordId: Number,
  isLiveOrdresAllowed: Boolean,
  jwtToken: String,
  refreshToken: String,
  feedToken: String
});

module.exports = mongoose.model('Settings', settingsSchema);
