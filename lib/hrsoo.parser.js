/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * This module is used to translate a set of tokens into
 * an standard JSON object with hours data
 */
var lexer = require('./hrsoo.lexer');
var utils = require('./hrsoo.utils');

/**
 * Go through and process the timezone token(s)
 * @param state
 * @returns {*}
 */
function parseTimezone(state) {
    state = state || {};
    state.tokens = state.tokens || [];

    var i, token, timezone;

    for (i = (state.tokens.length - 1); i >= 0; i--) {
        token = state.tokens[i];

        if (token.type === 'timezone') {
            if (timezone && token.value !== timezone) {
                utils.log('Multiple timezones found. Using ' + timezone + ' and ignoring ' + token.value, state);
            }
            else {
                timezone = token.value;
            }

            // remove the timezone token now that we have processed it
            state.tokens.splice(i, 1);
        }
    }

    state.timezone = timezone || 'est';  // est is default
    return state;
}

/**
 * Go through and process the ampm tokens. This is done by simply applying
 * the am or pm to the token directly preceeding.
 *
 * @param state
 * @returns {*}
 */
function parseAmPm(state) {
    state = state || {};
    state.tokens = state.tokens || [];

    var i, token, prevToken;

    for (i = (state.tokens.length - 1); i > 0; i--) {  // not a mistake > 0 because ampm shouldn't be first token
        token = state.tokens[i];
        prevToken = state.tokens[i - 1];

        if (token.type === 'ampm') {

            // mistake if previous token is operation
            if (prevToken.type === 'operation') {
                state.tokens.splice(i - 1, 1);
                i--;
                if (i === 0) {
                    break;
                }
                prevToken = state.tokens[i - 1];
            }

            if (prevToken.type === 'time') {
                prevToken.ampm = token.value;
            }
            else {
                utils.log('Previous token is ' + prevToken.type + ' ' +
                            prevToken.value +  ' so ignore timezone ' + token.value, state);
            }

            // we have used the value so remove it
            state.tokens.splice(i, 1);
        }
    }

    return state;
}

/**
 * If just two time tokens with through, then assume all week
 * @param state
 */
function timeAllWeek(state) {
    state = state || {};
    var tokens = state.tokens;

    // if just one token with time add a through token
    if (tokens.length === 2 && tokens[0].type === 'time' && tokens[1].type === 'time') {
        tokens.splice(1, 0, {
            type:   'operation',
            value:  'through'
        });
    }

    // now if three tokens that go time, through, time, then we assume all week
    if (tokens.length === 3 &&
        tokens[0].type === 'time' &&
        tokens[1].type === 'operation' && tokens[1].value === 'through' &&
        tokens[2].type === 'time') {

        tokens.splice(0, 0, {
            type: 'days',
            value: utils.daysOfWeek
        });
    }

    return state;
}

/**
 * Execute all tokens that with the given operation
 * @param state
 * @param opName
 * @param opFn
 * @returns {*}
 */
function doOperations(state, opName, opFn) {
    var i, token;

    for (i = (state.tokens.length - 1); i >= 0; i--) {
        token = state.tokens[i];

        if (token.type === 'operation' && token.value === opName) {
            state = opFn(state, i);
        }
    }

    return state;
}

/**
 * This will process any "through" token which means that someone
 * was doing a range between two values (either days or times).
 *
 * @param state
 * @param index
 * @returns {*}
 */
function throughOp(state, index) {

    // if through is first or last token, we can't do anything so remove it and go on
    if (index < 1 || index > (state.tokens.length - 2)) {
        //utils.log('Through operation without prev or next', state);
        state.tokens.splice(index, 1);
        state.errorThrough = 'Through operation without prev or next';
        return state;
    }

    // get the previous and next tokens for processing
    var prev = state.tokens[index - 1];
    var next = state.tokens[index + 1];
    var i, startDayIdx, endDayIdx, startTime, endTime;

    // if types don't match or not day or time, then just remove this token and ignore
    if (prev.type !== next.type || (prev.type !== 'days' && prev.type !== 'time')) {
        //utils.log('Through operation previous ' + prev.type + ' next ' + next.type, state);
        state.tokens.splice(index, 1);
        return state;
    }
    else if (prev.type === 'days') {

        if (!prev.value.length || !next.value.length) {
            utils.log('No days in prev or next', state);
            state.tokens.splice(index, 1);
            return state;
        }

        startDayIdx = utils.daysOfWeek.indexOf(prev.value[0]);
        endDayIdx = utils.daysOfWeek.indexOf(next.value[0]);

        if (startDayIdx < 0 || endDayIdx < 1) {
            utils.log('Start or end day does not exist', state);
            state.tokens.splice(index, 1);
            return state;
        }

        prev.value = [];
        for (i = startDayIdx; (i <= endDayIdx && i < utils.daysOfWeek.length); i++) {
            prev.value.push(utils.daysOfWeek[i]);
        }

        // this can happen with sat - sun
        if (endDayIdx < startDayIdx) {
            for (i = 0; i <= endDayIdx; i++) {
                prev.value.push(utils.daysOfWeek[i]);
            }
        }

        // remove through and next index
        state.tokens.splice(index, 2);
    }
    else if (prev.type === 'time') {
        prev.value = prev.value || {};
        next.value = next.value || {};

        startTime = (prev.value.hrs || 0) * 100 + (prev.value.mins || 0);
        endTime = (next.value.hrs || 0) * 100 + (next.value.mins || 0);

        // businesses generally open in am, close in pm
        prev.ampm = prev.ampm || 'am';
        next.ampm = next.ampm || 'pm';

        if ((next.ampm === 'pm' && endTime < 1200) || (endTime === 1200 && next.ampm === 'am')) {
            endTime += 1200;
        }

        if (prev.ampm === 'pm' && startTime < 1200) {
            startTime += 1200;
        }

        // endTime can be before startTime in situations where end time is late at night (ex. 8am - 2am)
        if (endTime > 300 && startTime >= endTime) {
            utils.log('Start time ' + startTime + ' must be before end time ' + endTime, state);
        }

        // replace prev token value with time range
        prev.value = {
            ranges: [{
                start: startTime,
                end: endTime
            }]
        };
        delete prev.ampm;

        // remove the through token and the second time token which aren't needed anymore
        state.tokens.splice(index, 2);
    }

    // return the latest state
    return state;
}

/**
 * Combine days with adjacent days and times with adjacent times
 * @param state
 */
function compressDayTimes(state) {
    state = state || {};
    var tokens = state.tokens || [];

    // not at least two tokens, return right away
    if (tokens.length < 2) { return state; }

    var prevToken, currentToken, i;

    for (i = (tokens.length - 1); i > 0; i--) {
        prevToken = tokens[i - 1];
        currentToken = tokens[i];

        // if hours listed at this point, log it because they should be ranges
        if (i === 1 && prevToken.value.hours) {
            utils.log('Token ' + (i - 1) + ' has hours in compressDayTimes', state);
        }
        if (currentToken.value.hours) {
            utils.log('Token ' + i + ' has hours in compressDayTimes', state);
        }

        if (prevToken.type === 'time' && !prevToken.value.isClosed &&
            currentToken.type === 'time' && !currentToken.value.isClosed) {

            // concat the ranges
            prevToken.value.ranges = prevToken.value.ranges || [];
            prevToken.value.ranges = prevToken.value.ranges.concat(currentToken.value.ranges || []);

            if (currentToken.value.allDay) {
                prevToken.value.allDay = true;
            }

            tokens.splice(i, 1);
        }
        else if (prevToken.type === 'days' && currentToken.type === 'days') {
            prevToken.value = prevToken.value.concat(currentToken.value);
            tokens.splice(i, 1);
        }
    }

    return state;
}

/**
 * Change ranges to booleans at 30 min increments
 * @param timeRanges
 * @returns {{}}
 */
function getTimeProfile(timeRanges) {
    timeRanges = timeRanges || [];

    var timeProfile = {};
    var i, timeRange, time, timeStr;

    for (i = 0; i < timeRanges.length; i++) {
        timeRange = timeRanges[i];
        time = timeRange.start;

        while (time < timeRange.end && time < 2400) {
            timeStr = time + '';
            timeProfile[timeStr] = true;

            if (timeStr.substring(timeStr.length - 2) === '00') {
                time += 30;
            }
            else {
                time += 70;
            }
        }
    }

    return timeProfile;
}


/**
 * Combine all the days and times; output should be array of tokens each of
 * which contains array of days and array of timeranges. If the tokens are
 * not listed in perfect pairs at this point (i.e. days token paired with time token)
 * then there is a problem.
 *
 * @param state
 */
function getDayTimes(state) {
    var dayTimes = {};
    var tokens = state.tokens || [];
    var upperBoundry = tokens.length - 1;
    var i = 0;
    var timeToken, dayToken, timeProfile, j, day, time;
    var isAllDayEveryDay = true;
    var isSameTime = true;
    var sameTime = null;

    while (i < upperBoundry) {
        timeToken = state.tokens[i];
        dayToken = state.tokens[i + 1];

        // if tokens not the right type, try to flip them
        if (timeToken.type !== 'time' && dayToken.type !== 'days') {
            timeToken = state.tokens[i + 1];
            dayToken = state.tokens[i];
        }

        var timeTokenStr = JSON.stringify(timeToken);
        if (!sameTime) {
            sameTime = timeTokenStr;
        }
        else if (sameTime !== timeTokenStr) {
            isSameTime = false;
        }

        // if still not the right type, log error, move up one, and go to next loop iteration
        if (timeToken.type !== 'time' && dayToken.type !== 'days') {
            utils.log('Tokens ' + i + ' and ' + (i + 1) + ' not time - days pair', state);
            i++;
            continue;
        }

        // get the time profile for a given set of ranges (i.e. map of 30 min key to boolean, i.e. 1430: true)
        timeProfile = getTimeProfile(timeToken.value.ranges);

        // now loop through days and apply profile to each day
        for (j = 0; j < dayToken.value.length; j++) {
            day = dayToken.value[j];
            dayTimes[day] = dayTimes[day] || {};

            if (timeToken.value.allDay) {
                dayTimes[day].allDay = true;
                dayTimes[day].low = 0;
                dayTimes[day].high = 2359;
            }
            else {
                isAllDayEveryDay = false;
                for (time in timeProfile) {
                    if (timeProfile.hasOwnProperty(time)) {
                        dayTimes[day][time] = true;
                    }
                }
            }
        }
        //dayTimes.ranges = timeToken.value.ranges; // i think we will need this in the future for math

        // move up 2
        i += 2;
    }

    var isAllWeek = Object.keys(dayTimes).length === 7;
    if (isAllWeek && isAllDayEveryDay) {
        return { everyDayAllTime: true };
    }
    else {
        dayTimes.isAllWeekSameTime = isAllWeek && isSameTime;
        dayTimes.timezone = state.timezone || 'est';
        return dayTimes;
    }
}

/**
 * Convert hours text to an object by first getting all tokens in string and then
 * working on tokens to the point where there are days - time pairs.
 *
 * @param hoursText
 * @param options
 * @return {} This object contains an array of days and an array of times (w startTime and endTime)
 */
function parse(hoursText, options) {
    var state = {};

    if (options && options.noLog) {                         // noLog option mostly used for testing
        state.noLog = true;
    }

    if (options && options.logHandler) {                    // noLog option mostly used for testing
        state.logHandler = options.logHandler;
    }

    state.tokens = lexer.getTokens(hoursText, options);     // use lexer to get initial tokens from the string

    state = parseTimezone(state);                           // get the timezone (only one allowed)
    state = parseAmPm(state);                               // apply AM/PM to all hours
    state = timeAllWeek(state);                             // use case where time by itself without days since all week
    state = doOperations(state, 'through', throughOp);      // do ranges of times and days
    if ( state.errorThrough ) {
        utils.log(state.errorThrough + ' while parsing ' + hoursText, state);
    }
    state = compressDayTimes(state);                        // compress times and days together

    return getDayTimes(state);                              // get object with combined days and times
}

// expose functions for this module
module.exports = {
    throughOp: throughOp,
    parseTimezone: parseTimezone,
    parseAmPm: parseAmPm,
    timeAllWeek: timeAllWeek,
    doOperations: doOperations,
    compressDayTimes: compressDayTimes,
    getTimeProfile: getTimeProfile,
    getDayTimes: getDayTimes,
    parse: parse
};