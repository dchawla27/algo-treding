const schedule = require('node-schedule');
const { TIMEZONE, MARKET_START_HOURS, MARKET_START_MINUTES, MARKET_END_HOURS, MARKET_END_MINUTES } = require('./config');
const { startProcess, stopProcess } = require('./process');

const scheduleJobs = () => {
    schedule.scheduleJob({ hour: MARKET_START_HOURS, minute: MARKET_START_MINUTES, tz: TIMEZONE }, startProcess);
    schedule.scheduleJob({ hour: MARKET_END_HOURS, minute: MARKET_END_MINUTES, tz: TIMEZONE }, stopProcess);
};

module.exports = scheduleJobs;
