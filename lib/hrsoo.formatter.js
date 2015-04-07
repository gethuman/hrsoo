/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Format a hrsoo object into a particular output format
 */
var parser = require('./hrsoo.parser');
var utils = require('./hrsoo.utils');
var timezones = {
    est: 500,
    cst: 400,
    mst: 300,
    pst: 200
};

/**
 * Get the time string from military time + timezone difference
 * @param time
 */
function getTimeString(time) {
    time = time || 0;

    if (time <= 0) {
        return '12am';
    }

    var hrs = Math.floor(time / 100);
    var mins = time - (hrs * 100);
    var ampm = (hrs > 11 && hrs < 24) ? 'pm' : 'am';

    if (hrs > 12) {
        hrs = hrs - 12;
    }

    if (hrs === 0) {
        hrs = 12;
    }

    var str = hrs;
    if (mins) { str += ':' + mins; }

    return str + ampm;
}

/**
 * Format time based on a time profile
 * @param timeProfile
 * @param currentTimezone
 * @param desiredTimezone
 */
function formatTime(timeProfile, currentTimezone, desiredTimezone) {
    currentTimezone = currentTimezone || 'est';
    desiredTimezone = desiredTimezone || 'est';

    if (!timeProfile) {
        return 'closed';
    }
    else if (timeProfile.allDay) {
        return 'all day';
    }

    var timezoneDiff = timezones[desiredTimezone] - timezones[currentTimezone];
    var time = 0;
    var timeStr = '';
    var allTimesStr = '';
    var groupStartTime = null;

    while (time <= 2400) {

        // get time string from time + am/pm and timezone diff
        timeStr = getTimeString(time + timezoneDiff);

        // if time selected and no group time yet, set it
        if (timeProfile[time + ''] && !groupStartTime) {
            groupStartTime = timeStr;
        }
        // else if either we are at midnight or no mor time selected and there is a group time, add it to the string
        else if ((!timeProfile[time + ''] || time === 2400) && groupStartTime) {
            if (allTimesStr) { allTimesStr += ', '; }
            allTimesStr += groupStartTime + '-' + timeStr;
            groupStartTime = null;
        }

        if ((time % 100) === 0) {
            time += 30;
        }
        else {
            time += 70;
        }
    }

    return allTimesStr;
}

/**
 * Convert an hours object to a formatted string
 * @param hoursObj
 * @param options
 * @returns {*}
 */
function stringify(hoursObj, options) {
    hoursObj = hoursObj || {};
    options = options || {};

    var type = options.type || 'medium';

    // special case for 24-7
    if (hoursObj.everyDayAllTime) {
        return type === 'short' ? '24-7' : '24 hours, 7 days';
    }

    var currentTimezone = hoursObj.timezone || 'est';
    var desiredTimezone = options.timezone || currentTimezone;
    var daysOfWeek = utils.daysOfWeek;
    var aliases = utils.aliases.days;
    var outputStr = '';
    var groupTime = null;
    var groupStartDay = null;
    var prevDayFormatted = null;
    var day, dayFormatted, timeFormatted;

    // go through the days of the week
    for (var i = 0; i < 7; i++) {
        day = daysOfWeek[i];

        dayFormatted = type === 'short' ? aliases[day][0] :
            type === 'medium' ? aliases[day][2] : day;
        dayFormatted = dayFormatted.substring(0, 1).toUpperCase() + dayFormatted.substring(1);

        timeFormatted = hoursObj[day] ?
            formatTime(hoursObj[day], currentTimezone, desiredTimezone) : 'closed';

        if (!groupTime) {
            groupTime = timeFormatted;
            groupStartDay = dayFormatted;
        }
        else if (timeFormatted !== groupTime) {

            if (groupTime !== 'closed') {
                if (outputStr) { outputStr += ', '; }
                outputStr += groupStartDay;
                if (prevDayFormatted !== groupStartDay) {
                    outputStr += '-' + prevDayFormatted;
                }
                outputStr += ' ' + groupTime;
            }

            // now reset values with current
            groupStartDay = dayFormatted;
            groupTime = timeFormatted;
        }

        prevDayFormatted = dayFormatted;
    }

    // need to do last day which is not in the loop
    if (groupTime !== 'closed') {
        if (outputStr) { outputStr += ', '; }
        outputStr += groupStartDay;
        if (prevDayFormatted !== groupStartDay) {
            outputStr += '-' + prevDayFormatted;
        }
        outputStr += ' ' + groupTime;
    }

    return outputStr + ' ' + desiredTimezone.toUpperCase();
}

/**
 * Simple object that turns hrs of operation text to an object and
 * then stringifies the object with a particular format.
 *
 * @param hrsText
 * @param options
 * @returns {*}
 */
function format(hrsText, options) {
    var hrsObj = parser.parse(hrsText, options);
    return stringify(hrsObj, options);
}

// expose functions
module.exports = {
    getTimeString: getTimeString,
    formatTime: formatTime,
    stringify: stringify,
    format: format
};