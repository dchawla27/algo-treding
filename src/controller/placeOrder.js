const { TIMEZONE, MARKET_END_HOURS, MARKET_END_MINUTES, API_KEY } = require('../config');
const eventBus = require('../eventBus');
const momentTz = require("moment-timezone");
const Orders = require("../schema/orderModel")
const config = require('../dynamicConfig')
const {searchScrip} = require("./searchScript");
const { placeFirstOrderToAngel, placeSqareOffOrderToAngel } = require('./placeOrderToAngel');
const { OT } = require('../common/constants');
const algotrend = require('../schema/algotrend');
const Settings = require("../schema/settings")



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
            if(!this.isOrderProcessStarted) this.checkConditions();
        });

        eventBus.on('superTrendValue', async (data) => {
            this.superTrendValue = parseInt(data);
            // console.log('Updated SuperTrend Value:', this.superTrendValue);
            console.log(this.ltp, this.superTrendDirection, this.superTrendValue)
            let superTrendDetails = new algotrend({ superTrendValue: this.superTrendValue, superTrendDirection: this.superTrendDirection})
            await superTrendDetails.save();
            if(!this.isOrderProcessStarted) this.checkConditions();
        });

        eventBus.on('superTrendDirection', (data) => {
            this.superTrendDirection = data;
            // console.log('Updated SuperTrend Direction:', this.superTrendDirection);
            if(!this.isOrderProcessStarted) this.checkConditions();
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
                    
                    const { type, optiontype, instrumentPrice } = this.isOrderPlaced;
                    orderType = type === OT.SELL ? OT.BUY : OT.SELL;
                   
                    if(optiontype == "CE"){
                        const diff = instrumentPrice - this.ltp ;
                        if(this.ltp > instrumentPrice && this.superTrendDirection === "down"){ // profit exit
                            this.targetPrice = this.ltp;
                            description = "TREND_DIRECTION_CHANGE";
                        }else if(diff >= 30){
                            this.targetPrice = this.ltp;
                            description = "STOP_LOSS_HIT";
                        }
                    }else if(optiontype == "PE"){
                        const diff = this.ltp - instrumentPrice ;
                        if(instrumentPrice > this.ltp && this.superTrendDirection === "up"){ // profit exit
                            this.targetPrice = this.ltp;
                            description = "TREND_DIRECTION_CHANGE";
                        }else if(diff >= 30){
                            this.targetPrice = this.ltp;
                            description = "STOP_LOSS_HIT";
                        }
                    } 
                } else {
                    this.targetPrice = this.superTrendDirection === "up" ? this.superTrendValue + 25 : this.superTrendValue - 25;
                }
        
                if (this.targetPrice && this.ltp === this.targetPrice) {
                    try {
                        await this.initiateOrder(this.ltp, this.superTrendDirection, description);
                        // console.log('order place complete', this.isOrderProcessStarted)
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
        }catch(e){
            console.error("Error in checkConditions:", e);
        }finally {
            this.isOrderProcessStarted = false; // Ensure reset after execution
        }

    }

    async isLiveOrderAllowed() {
        try{
            const settings = await Settings.find();
            if(settings && settings.length == 1){
                return settings[0].isLiveOrdresAllowed
            }
            return false;    
        }catch(e){
            console.log('error::', e)
            return false
        }
    }

    async initiateOrder(ltp, superTrendDirection, description) {

        if(!this.isLiveOrderAllowed()) return false;
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

    async dayCloseCheck(){
        console.log('checking day close')
        if(this.isOrderPlaced == null) return;

        this.isOrderProcessStarted = true;
        try{
            await this.initiateOrder(this.ltp, this.superTrendDirection, "DAY_TIME_END");
        }catch(e){
            console.log('error at DAY_TIME_END square off',e)
        }finally{
            this.isOrderProcessStarted = false;
        }
    }

    async disAllowLiveOrder(){
        try{
            await Settings.findByIdAndUpdate(
                "67af382c21b51ebda83c5748",
                { isLiveOrdresAllowed: false },
                { new: true }
            );
            console.log('Disabled the live orders')
        }catch(e){
            console.log('error in disabling the live orders')
        }
        
   }

    
}

module.exports = new OrderPlacer();
