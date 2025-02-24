const { TIMEZONE, MARKET_END_HOURS, MARKET_END_MINUTES } = require('../config');
const eventBus = require('../eventBus');
const momentTz = require("moment-timezone");
const Orders = require("../schema/orderModel")

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
        if (this.ltp !== null && this.superTrendValue !== null && this.superTrendDirection !== null && !this.isOrderProcessStarted) {
            this.targetPrice = null
            // console.log(this.ltp, this.superTrendDirection, this.superTrendValue)
            let orderType = this.superTrendDirection === "up" ? "Buy" : "Sell";
            let description = '';
    
            if (this.isOrderPlaced) {
                // console.log('Square-off order logic', this.isOrderPlaced)
                const { type, price } = this.isOrderPlaced;
    
                // Square-off order should be opposite type
                orderType = type === "Sell" ? "Buy" : "Sell";
    
                const now = momentTz().tz(TIMEZONE);
                const marketLastMin = now.clone().hour(MARKET_END_HOURS).minute(MARKET_END_MINUTES);
    
                if (now.isSame(marketLastMin.clone().subtract(1, "minute"), "minute")) {
                    this.targetPrice = this.ltp;
                    description = "DAY_TIME_END";
                } else if ((type === "Sell" && this.superTrendDirection === "up") || (type === "Buy" && this.superTrendDirection === "down")) {
                    this.targetPrice = this.ltp;
                    description = "TREND_DIRECTION_CHANGE";
                } else {
                    if (type === "Sell") {
                        const diff = this.ltp - price;
                        if (diff >= 30) {
                            this.targetPrice = this.ltp;
                            description = "STOP_LOSS_HIT";
                        }
                    }
                    if (type === "Buy") {
                        const diff = price - this.ltp;
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
            }
    
            // // **Prevent duplicate orders (Ensures Buy-Sell-Buy-Sell sequence)**
            // if (this.isOrderPlaced && this.isOrderPlaced.type === orderType) {
            //     console.log(`Skipping duplicate ${orderType} order`);
            //     return;
            // }
    
            if (this.targetPrice && this.ltp === this.targetPrice) {
                try {
                    this.isOrderProcessStarted = true;
                    // console.log('preparing order', this.isOrderProcessStarted)
                    let order = {
                        date: momentTz.tz(TIMEZONE).format(),
                        price: this.ltp,
                        type: orderType,
                        qty: this.orderQty,
                        superTrendValue: this.superTrendValue,
                        orderStatus: "open",
                        description
                    };
                    await this.placeOrderToDb(order);
                    this.isOrderProcessStarted = false;
                    // console.log('order place complete', this.isOrderProcessStarted)
                } catch (error) {
                    this.isOrderProcessStarted = false;
                    console.log(error)
                }
            }
        }
    

    }
    async placeOrderToDb(order) {
        try {
            const openOrders = await Orders.find({ orderStatus: "open" });
            if (openOrders.length > 0) {
                await Orders.findByIdAndUpdate(
                    openOrders[0]._id.toString(),
                    { orderStatus: "complete" },
                    { new: true }
                );
                order.orderStatus = "complete"
                const newOrder = new Orders(order);
                await newOrder.save();
                this.isOrderPlaced = null;
            }else{
                const newOrder = new Orders(order);
                await newOrder.save();
                this.isOrderPlaced = order;
            }
    
            // **Set isOrderPlaced before saving to prevent duplicates**
            
            
            return true;

        } catch (error) {
            
            console.error("Error placing order:", error);
            return false;
        }
    }

    
}

module.exports = new OrderPlacer();
