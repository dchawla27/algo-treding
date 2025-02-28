let { SmartAPI, WebSocketClient, WebSocketV2, WSOrderUpdates} = require("../../lib");
const { API_KEY, SEARCH_SCRIPT } = require("../config");
const config =  require('../dynamicConfig')



async function searchScrip() {
    let smart_api = new SmartAPI({
        api_key: API_KEY,
        access_token: config.JWT_TOKEN,
        refresh_token: config.REFRESH_TOKEN,
    });

    try {
        const data = await smart_api.searchScrip({
            exchange: "NFO",
            searchscrip: SEARCH_SCRIPT,
        });

        // console.log('data',data);
        // Return combined data
       return data;
    } catch (error) {
        console.error("Error in searchScrip:", error);
        return null;
    }
}
module.exports = { searchScrip };