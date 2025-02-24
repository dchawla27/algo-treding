let moment = require("moment-timezone");
let { SmartAPI, WebSocketClient, WebSocketV2, WSOrderUpdates} = require("../../lib");
const { calculateATR, calculateSuperTrend } = require("../common/indicators");
const sharedState = require('../store/sharedState');
const dynamicConfig = require('../dynamicConfig');
const {API_KEY, TIMEZONE} = require("../config")
const eventBus = require('../eventBus');

const updateSuperTrend = async (candles) => {
    if (candles.length > 0) {
      const multiplier = 2;
      const limit = 20;
      
      const superTrend = await calculateSuperTrend(candles, multiplier, limit);
      sharedState.superTrend = superTrend
      return superTrend
    }
  };

  
const fetchCandleData = async () => {
    try {

        let currentTime = moment().tz(TIMEZONE);
        let end = currentTime.format("YYYY-MM-DD HH:mm");
        let start = currentTime.clone().subtract(10, "day").format("YYYY-MM-DD HH:mm");

        let smart_api = new SmartAPI({
            api_key: API_KEY,
            access_token: dynamicConfig.JWT_TOKEN,
            refresh_token: dynamicConfig.REFRESH_TOKEN
        });

        const data = await smart_api.getCandleData({
          exchange: 'NSE',
          symboltoken: '99926000',
          interval: "FIVE_MINUTE",
          fromdate: start,
          todate: end,
        });
    
        if (!data || data.success === false || !Array.isArray(data.data)) {
          console.error("Error fetching data from API:", data);
        }else{
            const stockData = data.data.map(
                ([time, open, high, low, close, volume]) => ({
                  time,
                  open,
                  high,
                  low,
                  close,
                  volume,
                })
              );
              let resultData = await updateSuperTrend(stockData)
              if(resultData?.latestSuperTrend){
                eventBus.emit('superTrendValue', resultData.latestUpperBand);
                eventBus.emit('superTrendDirection', "up");
              }else{
                eventBus.emit('superTrendValue', resultData.latestLowerBand);
                eventBus.emit('superTrendDirection', "down");
              }
              // console.log('-------------------new supertrend called -----------------------')
              return resultData

            
        }
    } catch (error) {
        console.error('❌ Error Fetching Candle Data:', error);
    }
};
module.exports = { fetchCandleData};