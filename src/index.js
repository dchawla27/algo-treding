const { startProcess } = require("./process");
const scheduleJobs = require("./scheduler");
const momentTz = require("moment-timezone");
const {  TIMEZONE, MARKET_START_HOURS, MARKET_START_MINUTES, MARKET_END_HOURS, MARKET_END_MINUTES } = require("./config");
const connectDB = require("./db");


const isMarketOpen = () => {
    const now = momentTz().tz(TIMEZONE);
    console.log(`Current time: ${now.format()}`); 
    return now.isBetween(now.clone().hour(MARKET_START_HOURS).minute(MARKET_START_MINUTES), now.clone().hour(MARKET_END_HOURS).minute(MARKET_END_MINUTES));
};

const main = async () => {
    try {
        await connectDB();
        if (isMarketOpen()) {
            startProcess();
        } else {
            console.log("⏳ Market is closed.");
        }

        scheduleJobs();
    } catch (error) {
        console.error("❌ Error in main function:", error);
    }
};

main();

