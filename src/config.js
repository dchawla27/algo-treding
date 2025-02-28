require('dotenv').config();

module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  WS_URL: process.env.WS_URL,
  API_KEY: process.env.API_KEY,
  CLIENT_CODE: process.env.CLIENT_CODE,
  INTERVAL_MS: parseInt(process.env.INTERVAL_MS, 10),
  TIMEZONE: process.env.TIMEZONE,
  MARKET_START_HOURS: process.env.MARKET_START_HOURS,
  MARKET_START_MINUTES: process.env.MARKET_START_MINUTES,
  MARKET_END_HOURS: process.env.MARKET_END_HOURS,
  MARKET_END_MINUTES: process.env.MARKET_END_MINUTES,
  SEARCH_SCRIPT: process.env.SEARCH_SCRIPT,
  ORDER_QTY:  process.env.ORDER_QTY
};