const { TIMEZONE, MARKET_END_HOURS, MARKET_END_MINUTES, API_KEY } = require('../config');
const eventBus = require('../eventBus');
const momentTz = require("moment-timezone");
const Orders = require("../schema/orderModel")
const config = require('../dynamicConfig')
const {searchScrip} = require("./searchScript");
const { placeFirstOrderToAngel, placeSqareOffOrderToAngel } = require('./placeOrderToAngel');
const { OT } = require('../common/constants');



class OrderPlacer {
    constructor() {
        this.ltp = null;
        this.superTrendValue = null;
        this.superTrendDirection = null;
        this.isOrderPlaced = null;
        this.targetPrice = null
        this.orderQty = 75
        this.isOrderProcessStarted = false;

        this.checkOpenOrders()

        eventBus.on('ltp', (data) => {
            this.ltp = parseInt(data);
            // console.log('Updated LTP:', this.ltp);
            this.checkConditions();
        });

        eventBus.on('superTrendValue', (data) => {
            this.superTrendValue = parseInt(data);
            // console.log('Updated SuperTrend Value:', this.superTrendValue);
            this.checkConditions();
        });

        eventBus.on('superTrendDirection', (data) => {
            this.superTrendDirection = data;
            // console.log('Updated SuperTrend Direction:', this.superTrendDirection);
            this.checkConditions();
        });
    }

    async checkOpenOrders(){
        try{
            const openOrders = await Orders.find({ orderStatus: "open" });
            if (openOrders.length > 0) {
               this.isOrderPlaced = openOrders[0]
            }
        }catch(e){
            console.log('error in fetching open orders:',e)
        }
    }

    async checkConditions() {
        if(this.isOrderProcessStarted) return false;
        this.isOrderProcessStarted = true;
        try {
            if (this.ltp !== null && this.superTrendValue !== null && this.superTrendDirection !== null) {
                this.targetPrice = null
                // console.log(this.ltp, this.superTrendDirection, this.superTrendValue)
                let orderType = this.superTrendDirection === "up" ? OT.BUY : OT.SELL;
                let description = '';
                if (this.isOrderPlaced) {
                    
                    const { type, instrumentPrice } = this.isOrderPlaced;
        
                    // Square-off order should be opposite type
                    orderType = type === OT.SELL ? OT.BUY : OT.SELL;
        
                    const now = momentTz().tz(TIMEZONE);
                    const marketLastMin = now.clone().hour(MARKET_END_HOURS).minute(MARKET_END_MINUTES);
        
                    if (now.isSame(marketLastMin.clone().subtract(1, "minute"), "minute")) {
                        this.targetPrice = this.ltp;
                        description = "DAY_TIME_END";
                    } else if ((type === OT.SELL && this.superTrendDirection === "up") || (type === OT.BUY && this.superTrendDirection === "down")) {
                        this.targetPrice = this.ltp;
                        description = "TREND_DIRECTION_CHANGE";
                    } else {
                        if (type === OT.SELL) {
                            const diff = this.ltp - instrumentPrice;
                            if (diff >= 30) {
                                this.targetPrice = this.ltp;
                                description = "STOP_LOSS_HIT";
                            }
                        }
                        if (type === OT.BUY) {
                            const diff = instrumentPrice - this.ltp;
                            if (diff >= 30) {
                                this.targetPrice = this.ltp;
                                description = "STOP_LOSS_HIT";
                            }
                        }
                    }
                    
                } else {
                    // First order placement logic
                    // console.log('First order placement logic. orderPlaced? ', this.isOrderPlaced)
                    this.targetPrice = this.superTrendDirection === "up" ? this.superTrendValue + 20 : this.superTrendValue - 20;
                    this.isOrderProcessStarted = true;
                }
        
                // // **Prevent duplicate orders (Ensures Buy-Sell-Buy-Sell sequence)**
                // if (this.isOrderPlaced && this.isOrderPlaced.type === orderType) {
                //     console.log(`Skipping duplicate ${orderType} order`);
                //     return;
                // }
        
                if (this.targetPrice && this.ltp === this.targetPrice) {
                    try {
                        await this.initiateOrder(this.ltp, this.superTrendDirection, description);
                        this.isOrderProcessStarted = false;
                        // console.log('order place complete', this.isOrderProcessStarted)
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
        }catch(e){
            console.error("Error in checkConditions:", error);
        }finally {
            this.isOrderProcessStarted = false; // Ensure reset after execution
        }

    }


    async initiateOrder(ltp, superTrendDirection, description) {
        console.log("Initiating order with:", ltp, superTrendDirection, this.superTrendValue);
    
        const session = await Orders.startSession();
        session.startTransaction(); // Start transaction
    
        try {
            const openOrders = await Orders.find({ orderStatus: "open" }).session(session);
            
            if (openOrders.length > 0) {
                console.log("Placing square off order to Angel");
                let res = await placeSqareOffOrderToAngel(openOrders);
                if (!res) throw new Error("Failed to place square-off order");
    
                await Orders.findByIdAndUpdate(
                    openOrders[0]._id.toString(),
                    { orderStatus: "complete" },
                    { new: true, session }
                );
    
                const newOrder = new Orders({
                    ...res,
                    orderStatus: "complete",
                    superTrendValue: this.superTrendValue,
                    description,
                    instrumentPrice: ltp
                });
    
                await newOrder.save({ session });
    
                this.isOrderPlaced = null;
            } else {
                console.log("Placing first order to Angel");
                let res = await placeFirstOrderToAngel(ltp, superTrendDirection);
                if (!res) throw new Error("Failed to place first order");
    
                const newOrder = new Orders({
                    ...res,
                    orderStatus: "open",
                    superTrendValue: this.superTrendValue
                });
    
                await newOrder.save({ session });
                this.isOrderPlaced = newOrder;
            }
    
            await session.commitTransaction(); // Commit transaction
            return true;
        } catch (error) {
            console.error("Error in initiateOrder:", error);
            await session.abortTransaction(); // Rollback transaction on error
            return false;
        } finally {
            session.endSession();
        }
    }    

   

    
}

module.exports = new OrderPlacer();
