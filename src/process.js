const { fetchCandleData } = require("./controller/candleData");
const { startWebSocket, stopWebSocket } = require("./controller/webSocket");
const {  INTERVAL_MS } = require("./config");

const fetchLoginDetails = require("./controller/fetchLoginDetails");
const connectDB = require("./db");


let interval = null;

const startProcess = async () => {
    if (interval) return;
    await connectDB();
    await fetchLoginDetails();

    fetchCandleData();
    interval = setInterval(fetchCandleData, INTERVAL_MS);
    startWebSocket();
    
};

const stopProcess = async() => {
    const OrderPlacer = require('./controller/placeOrder');
    clearInterval(interval);
    interval = null;
    await OrderPlacer.dayCloseCheck()
    await OrderPlacer.disAllowLiveOrder()
    stopWebSocket();
};

module.exports = { startProcess, stopProcess };
