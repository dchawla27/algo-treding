const connectDB = require("./db");
const { isMarketOpen, startProcess } = require("./process");
const scheduleJobs = require("./scheduler");
const fetchLoginDetails = require("./controller/fetchLoginDetails");

const main = async () => {
    try {
        await connectDB();
        await fetchLoginDetails();

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
