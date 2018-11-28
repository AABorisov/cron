var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const cron = require('node-cron');
const year = 1000*60*60*24*365;

const isTestedOnSeconds = true;

const generateEntity = function (timeNumber) {
    const time = new Date(timeNumber);
    let delayed_time = time.toLocaleString('ru-RU')
        .replace(',','') // 2-12-2018, 11:11 --> 12-12-2018 11:11
        .replace('-','.'); // 12-12-2018 11:11 --> 12.12.2018 11:11
    if (!isTestedOnSeconds) {
        delayed_time.slice(0, -3) // remove seconds
    }
    return {
        _id: time - Math.floor(Math.random() * year),
        title: time.toString(),
        delayed_time
    }
};

const generateData = function (number = 1000) {
    const nowNumber = +(new Date());
    let data = [];
    const minute = isTestedOnSeconds ? 1000 : 1000*60;
    for (let i = 0; i < number; i++) {
        data[i] = generateEntity(parseInt(nowNumber
            + i*3*minute // every 3 minutes
            + Math.floor(Math.random() * 6*minute) // random delay to be able to have 0, 1, or 2 entities every 3 minutes
        ))
    }
    return data;
};

let approvedData = [];
let delayedData = generateData();
let scheduledItems = [];

const getDelayedData = function () {
    return delayedData
};

const getScheduledItems = function() {
    return scheduledItems;
};

const resetScheduledItems = function () {
    scheduledItems = [];
};

const executeSomething = function (entity) {
    console.log(entity)
};

const approveEntities = function (ids) {
    let approvedIds = [...ids];
    delayedData = delayedData.reduce((newDelayedData, entity) => {
        if (approvedIds.includes(entity._id)) {
            approvedIds = approvedIds.filter((id) => entity._id !== id);
            scheduledItems = scheduledItems.filter((item) => item._id !== entity._id);
            // Execute something
            executeSomething(entity);
            approvedData.push(entity);
        } else {
            newDelayedData.push(entity);
        }
        return newDelayedData;
    }, []);
};

const scheduleFn = () => {
    const minute = isTestedOnSeconds ? 1000 : 1000*60;
    // Plan tasks every hour
    const nowNumber = +(new Date());
    const plannedNumber = nowNumber + 60*minute + 3*minute;
    // Update every hour
    resetScheduledItems();
    const delayedData = getDelayedData();
    delayedData.forEach((entity) => {
        let entityTime = +(new Date(entity.delayed_time));
        if ((entityTime >= nowNumber) && (entityTime < plannedNumber)) {
            scheduledItems.push({
                id: entity._id,
                time: entityTime
            });
        }
    })
};
const executeFn = () => {
    const minute = isTestedOnSeconds ? 1000 : 1000*60;
    // Find tasks every 3 minutes
    const nowNumber = +(new Date());
    console.log('executeFn', new Date(nowNumber).toLocaleString('ru-RU'));
    const prevNumber = nowNumber - 3*minute;

    const scheduledItems = getScheduledItems();
    const approvingIds = scheduledItems.filter((item) => (item.time > prevNumber) && (item.time <= nowNumber))
        .map((item) => item.id);
    approveEntities(approvingIds);
};

const scheduleExpression = isTestedOnSeconds ? '* * * * *' : '* * * *';
const executeExpression = isTestedOnSeconds ? '*/3 * * * * *' : '*/3 * * * *';
cron.schedule(scheduleExpression, scheduleFn, {scheduled: true});
cron.schedule(executeExpression, executeFn, {scheduled: true});
scheduleFn();

module.exports = app;
