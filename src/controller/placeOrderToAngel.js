const { ORDER_QTY, API_KEY } = require("../config");
const config = require("../dynamicConfig")
const { searchScrip } = require("./searchScript")
let { SmartAPI, WebSocketClient, WebSocketV2, WSOrderUpdates} = require("../../lib");
const { OT } = require("../common/constants");

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const placeFirstOrderToAngel = async( ltp, superTrendDirection ) => {
    let list  = await searchScrip()
    console.log(' found the list')
    if(list && list.length >0){
        let increasedLTP = superTrendDirection == "up" ? ltp - 400 : ltp + 400
        const instrument = selectOption(list, superTrendDirection, increasedLTP);
        console.log(' found the instrument', instrument)
        if(instrument && instrument.tradingsymbol){
            try {
                const orderType = OT.BUY
                const {exchange, tradingsymbol, symboltoken  } = instrument

                let smart_api = new SmartAPI({
                    api_key: API_KEY,
                    access_token: config.JWT_TOKEN,
                    refresh_token: config.REFRESH_TOKEN,
                });

                const orderResponse = await smart_api.placeOrder({
                  variety: "NORMAL",
                  tradingsymbol: tradingsymbol,
                  symboltoken: symboltoken,
                  transactiontype: orderType,
                  exchange: exchange,
                  ordertype: "MARKET",
                  producttype: "INTRADAY",
                  duration: "DAY",
                  squareoff: "0",
                  stoploss: "0",
                  quantity: ORDER_QTY
                });
                console.log('order placed ', orderResponse)
                await delay(1000);
                if(orderResponse?.data?.uniqueorderid){
                    let oID = orderResponse?.data?.uniqueorderid
                    let tradeBook = await smart_api.getOrderBook();
                   
                    if(tradeBook && tradeBook?.data && tradeBook.data.length > 0){
                        console.log('got tradeBook')
                        let placedOrder = tradeBook.data?.filter(x=>x.uniqueorderid == oID && x.orderstatus == "complete")
                        if(placedOrder && placedOrder.length == 1){
                            console.log('found the order', placedOrder)
                            const {transactiontype, exchtime, tradingsymbol, averageprice, lotsize, exchange, symboltoken, strikeprice, optiontype, expirydate, orderStatus} =  placedOrder[0]
                            return {
                                success: true,
                                message: orderResponse.message,
                                orderid: orderResponse.data.orderid,
                                uniqueorderid: orderResponse.data.uniqueorderid,
                                type: transactiontype,
                                date: exchtime, 
                                instrument: tradingsymbol,
                                price: averageprice,
                                qty: lotsize,
                                exchange, 
                                symboltoken,
                                strikeprice,
                                optiontype,
                                expirydate,
                                orderStatus,
                                description:'',
                                superTrendValue:'',
                                instrumentPrice: ltp
                              }
                        }
                    }else{
                        console.log('failed got tradeBook', tradeBook)
                    }
                   
                    return false
                }
                return false
              } catch (error) {
                console.error("❌ Error in orderToAngel:", error.message || error);
                return {
                  success: false,
                  message: "An error occurred while placing the order",
                  error: error.message || error
                };
              }
        }
        return false
    }else{
        return false;
    }
    // console.log('list',list)
}

const placeSqareOffOrderToAngel = async(openOrders) => {

    if(openOrders && openOrders.length == 1){
        const {instrument, symboltoken, type, exchange} = openOrders[0];
        console.log('openOrders',openOrders)
    
        const orderType = type == OT.BUY ? OT.SELL : OT.BUY
        let smart_api = new SmartAPI({
            api_key: API_KEY,
            access_token: config.JWT_TOKEN,
            refresh_token: config.REFRESH_TOKEN,
        });
    
       
        const orderResponse = await smart_api.placeOrder({
          variety: "NORMAL",
          tradingsymbol: instrument,
          symboltoken: symboltoken,
          transactiontype: orderType,
          exchange: exchange,
          ordertype: "MARKET",
          producttype: "INTRADAY",
          duration: "DAY",
          squareoff: "0",
          stoploss: "0",
          quantity: ORDER_QTY
        });
        console.log('order sqare off ', orderResponse)
        await delay(1000);
        if(orderResponse?.data?.uniqueorderid){
            let oID = orderResponse?.data?.uniqueorderid
            let tradeBook = await smart_api.getOrderBook();
            if(tradeBook && tradeBook?.data && tradeBook.data.length > 0){
                let placedOrder = tradeBook.data?.filter(x=>x.uniqueorderid == oID && x.orderstatus == "complete")
                if(placedOrder && placedOrder.length == 1){
                    const {transactiontype, exchtime, tradingsymbol, averageprice, lotsize, exchange, symboltoken, strikeprice, optiontype, expirydate, orderStatus} =  placedOrder[0]
                    return {
                        success: true,
                        message: orderResponse.message,
                        orderid: orderResponse.data.orderid,
                        uniqueorderid: orderResponse.data.uniqueorderid,
                        type: transactiontype,
                        date: exchtime, 
                        instrument: tradingsymbol,
                        price: averageprice,
                        qty: lotsize,
                        exchange, 
                        symboltoken,
                        strikeprice,
                        optiontype,
                        expirydate,
                        orderStatus,
                        description:'',
                        superTrendValue:'',
                        instrumentPrice:''
                      }
                }
            }
            
            return false
        }
        return false
    }
    return false
    
}

const selectOption = (options, superTrendDirection, ltp) => {
    const isBuy = superTrendDirection === "up";
    const suffix = isBuy ? "CE" : "PE";

   
    const filteredOptions = options
        .filter(o => o.tradingsymbol.endsWith(suffix)) 
        .map(o => {
            const match = o.tradingsymbol.match(/(\d{5})(?=CE|PE)/); // Extract last 5 digits before CE/PE
            return {
                ...o,
                strike: match ? parseInt(match[1]) : null
            };
        })
        .filter(o => o.strike !== null); 

    
    filteredOptions.sort((a, b) => a.strike - b.strike);

    
    let selectedOption;
    if (isBuy) {
        selectedOption = [...filteredOptions].reverse().find(o => o.strike <= ltp);
    } else {
        selectedOption = filteredOptions.find(o => o.strike >= ltp);
    }
    return selectedOption || null; // Return the selected option or null if none found
  }

module.exports = {placeFirstOrderToAngel, placeSqareOffOrderToAngel}