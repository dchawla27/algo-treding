const { API_KEY } = require("../config");
const dynamicConfig = require('../dynamicConfig');
let { SmartAPI, WebSocketClient, WebSocketV2, WSOrderUpdates } = require("../../lib");
const Settings = require("../schema/settings")
const refreshToken = async () => {
    
    let smart_api = new SmartAPI({
        api_key: API_KEY,
        access_token: dynamicConfig.JWT_TOKEN,
        refresh_token: dynamicConfig.REFRESH_TOKEN
    });

    try{
        const newToket = await smart_api.generateToken(dynamicConfig.REFRESH_TOKEN)
        await Settings.findByIdAndUpdate(
            "67af382c21b51ebda83c5748",
            { jwtToken: newToket.data.jwtToken, refreshToken: newToket.data.refreshToken, feedToken: newToket.data.feedToken },
            { new: true }
        );
        console.log('Token updated successfuly.')
    }catch(e){
        console.log('Error in updating Token.',e)
    }
    
};

module.exports = { refreshToken };
