const connectDB = require("./db");
const { isMarketOpen, startProcess } = require("./process");
const scheduleJobs = require("./scheduler");
const OrderPlacer = require('./controller/placeOrder');

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

async function tempMain(){
    try{
        await connectDB();
        const res = await OrderPlacer.isLiveOrderAllowed()
        console.log('res',res)
        await OrderPlacer.checkOpenOrders()
    }catch(e){
        console.log('error', e)
    }
}

// tempMain()
