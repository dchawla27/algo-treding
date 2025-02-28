const fetchLoginDetails = require("./controller/fetchLoginDetails");
const { placeFirstOrderToAngel } = require("./controller/placeOrderToAngel");
const connectDB = require("./db");
const Orders = require("./schema/orderModel")
const { ORDER_QTY, API_KEY } = require("./config");
const config = require("./dynamicConfig")
let { SmartAPI, WebSocketClient, WebSocketV2, WSOrderUpdates} = require("../lib");

async function main(){
    try{
        await connectDB();
        await fetchLoginDetails();
        console.log("----------------start-----------------")
        

    }catch(e){
        console.log('error:', e)
    }
}

main()