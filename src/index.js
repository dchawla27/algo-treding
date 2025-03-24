const { isMarketOpen, startProcess } = require("./process");
const scheduleJobs = require("./scheduler");


const main = async () => {
    try {

        // await connectDB();
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

