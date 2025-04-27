const schedule = require('node-schedule');
const { TIMEZONE, MARKET_START_HOURS, MARKET_START_MINUTES, MARKET_END_HOURS, MARKET_END_MINUTES, REFRESH_TOKEN_HOUR, REFRESH_TOKEN_MIN } = require('./config');
const { startProcess, stopProcess } = require('./process');
const {refreshToken} = require('./controller/refreshToken')

const scheduleJobs = () => {
    schedule.scheduleJob({ hour: MARKET_START_HOURS, minute: MARKET_START_MINUTES, tz: TIMEZONE }, startProcess);
    schedule.scheduleJob({ hour: MARKET_END_HOURS, minute: MARKET_END_MINUTES, tz: TIMEZONE }, stopProcess);
    schedule.scheduleJob({ hour: REFRESH_TOKEN_HOUR, minute: REFRESH_TOKEN_MIN, tz: TIMEZONE }, refreshToken);
};

module.exports = scheduleJobs;
