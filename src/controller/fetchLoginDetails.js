const Settings = require("../schema/settings")
const config = require("../dynamicConfig");

const fetchLoginDetails = async () => {
    try {
        const settings = await Settings.find();
        if(settings && settings.length == 1){
            let res = settings[0]
            config.JWT_TOKEN = res.jwtToken;
            config.FEED_TOKEN = res.feedToken
            config.REFRESH_TOKEN = res.refreshToken
            config.isLiveOrdresAllowed = res.isLiveOrdresAllowed
        }else{
            console.error('❌ Error in settings table:');
        }
        
    } catch (error) {
        console.error('❌ Error Fetching Candle Data:', error);
    }
}

module.exports = fetchLoginDetails;