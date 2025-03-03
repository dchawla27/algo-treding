const { fetchCandleData } = require("./controller/candleData");
const { startWebSocket, stopWebSocket } = require("./controller/webSocket");
const { API_KEY, INTERVAL_MS, TIMEZONE, MARKET_START_HOURS, MARKET_START_MINUTES, MARKET_END_HOURS, MARKET_END_MINUTES } = require("./config");
const momentTz = require("moment-timezone");
const OrderPlacer = require('./controller/placeOrder');


let interval = null;

const isMarketOpen = () => {
    const now = momentTz().tz(TIMEZONE);
    return now.isBetween(now.clone().hour(MARKET_START_HOURS).minute(MARKET_START_MINUTES), now.clone().hour(MARKET_END_HOURS).minute(MARKET_END_MINUTES));
};

const startProcess = () => {
    if (interval) return;

    fetchCandleData();
    interval = setInterval(fetchCandleData, INTERVAL_MS);
    startWebSocket();
    
};

const stopProcess = async() => {
    clearInterval(interval);
    interval = null;
    await OrderPlacer.dayCloseCheck()
    stopWebSocket();
};

module.exports = { startProcess, stopProcess, isMarketOpen };
