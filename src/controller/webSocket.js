const WebSocket = require("ws");
const { WS_URL, API_KEY, CLIENT_CODE } = require("../config");
const config = require('../dynamicConfig')
const eventBus = require('../eventBus');


let socketInstance = null;
let heartbeatInterval = null;

const startWebSocket = () => {
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
        console.log("⚡ WebSocket already running");
        return;
    }

    socketInstance = new WebSocket(WS_URL, {
        headers: {
            Authorization: `Bearer ${config.JWT_TOKEN}`,
            "x-api-key": API_KEY,
            "x-client-code": CLIENT_CODE,
            "x-feed-token": config.FEED_TOKEN,
        },
    });

    socketInstance.on("open", () => {
        console.log("✅ Connected to WebSocket");
        socketInstance.send(JSON.stringify({
            correlationID: "abcde12345",
            action: 1,
            params: { mode: 1, tokenList: [{ exchangeType: 1, tokens: ["99926000"] }] },
        }));

        heartbeatInterval = setInterval(() => {
            if (socketInstance?.readyState === WebSocket.OPEN) {
                socketInstance.send("ping");
            }
        }, 30000);
    });

    socketInstance.on("error", (err) => console.error("❌ WebSocket Error:", err));
    
    socketInstance.on("close", (code, reason) => {
        console.warn(`❌ WebSocket Closed: ${code} - ${reason}`);
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    });

    socketInstance.on("message", async (message) => {
        if (message === "pong") return;

        const data = new Uint8Array(message);
        const ltpBytes = data.slice(43, 47);
        const ltpValue = ltpBytes.reduce((value, byte, index) => value + byte * Math.pow(256, index), 0);
        const ltp = ltpValue / 100;
        
        if (ltp === 0) return;

        eventBus.emit('ltp', ltp);
        // console.log("📊 LTP:", ltp);
    });
};

const stopWebSocket = () => {
    console.log("🔴 Disconnecting WebSocket...");
    if (socketInstance) {
        socketInstance.close();
        socketInstance = null;
    }
};

module.exports = { startWebSocket, stopWebSocket };
