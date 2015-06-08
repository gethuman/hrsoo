(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.hrsoo = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Author: Jeff Whelpley
 * Date: 4/2/15
 *
 * Main interface for hrsoo when including it in node or the browser
 */
var parser = require('./hrsoo.parser');
var formatter = require('./hrsoo.formatter');

// we are only exposing a couple funcs from this module
module.exports = {
    parse:      parser.parse,
    stringify:  formatter.stringify,
    format:     formatter.format
};

},{"./hrsoo.formatter":2,"./hrsoo.parser":4}],2:[function(require,module,exports){
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

    // zero is the floor
    if (time <= 0) { time = 0; }

    // if time is 0, 1200 or 2400, return specific string
    if (time === 0 || time === 2400) {
        return 'midnight';
    }
    else if (time === 1200) {
        return 'noon';
    }

    var hrs = Math.floor(time / 100);
    var mins = time - (hrs * 100);
    var ampm = (hrs > 11 && hrs < 24) ? 'pm' : 'am';

    if (hrs > 12) {
        hrs = hrs - 12;
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

    return allTimesStr ? allTimesStr : 'closed';
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

        if (hoursObj.isAllWeekSameTime) {
            outputStr = timeFormatted;
            break;
        }
        else if (!groupTime) {
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
    if (groupTime && groupTime !== 'closed') {
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
},{"./hrsoo.parser":4,"./hrsoo.utils":5}],3:[function(require,module,exports){
/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Goal of this module is to take a string with hours of operation
 * and output a set of tokens that can be used by the parser
 */
var utils = require('./hrsoo.utils');

/**
 * Read one string of letters
 * @param state
 */
function readString(state) {

    // do nothing if not the right params
    if (!state || !state.text) {
        return state;
    }

    var len = state.text.length;
    var index = state.index || 0;
    var str = '';
    var ch;
    var prevChar = index > 0 ? state.text.charAt(index - 1) : null;

    // get one word (i.e. until not a letter)
    while (index < len) {
        ch = state.text.charAt(index);

        if (!utils.isIgnore(ch)) {
            if (!utils.isLetter(ch)) {
                break;
            }

            str += ch;
        }

        index++;
    }
    state.index = index;

    // if no string, then just return here
    if (!str) {
        return state;
    }

    str = str.toLowerCase();
    state.tokens = state.tokens || [];

    var timezone = utils.lookupAlias('timezones', str);
    var day = utils.lookupAlias('days', str);
    var op = utils.lookupAlias('operations', str);

    if (utils.isAmPm(str, prevChar)) {
        if (str === 'a') { str = 'am'; }
        if (str === 'p') { str = 'pm'; }
        state.tokens.push({ type: 'ampm', value: str });
    }
    else if (timezone) {
        state.tokens.push({ type: 'timezone', value: timezone });
    }
    else if (op) {
        state.tokens.push({ type: 'operation', value: op });
    }
    else if (day) {
        state.tokens.push({ type: 'days', value: [day] });
    }
    else if (str === 'closed') {
        state.tokens.push({ type: 'time', value: { isClosed: true }});
    }
    //else if (!utils.isIgnore(str)) {
    //    utils.log('Unknown string ' + str, state);
    //}

    return state;
}

/**
 * Read digits and : to get a time
 * @param state
 */
function readTime(state) {
    var time = '0';
    var ch, hrs, mins;
    var colonFound = false;
    var charCount = 0;

    while (state.index < state.text.length) {
        ch = state.text.charAt(state.index);

        if (ch === ':' || (!colonFound && charCount < 3 && ch === '.')) {
            colonFound = true;
            hrs = parseInt(time);
            time = '0';
        }
        else if (!utils.isNumber(ch)) {
            break;
        }
        else {
            time += ch;
        }

        charCount++;
        state.index++;
    }

    if (hrs) {
        mins = parseInt(time);
    }
    else {
        hrs = parseInt(time);
        mins = 0;
    }

    // in this situation the person forgot the colon
    if (hrs > 12 && !colonFound && (hrs + '').length > 2) {
        var totalTime = hrs;
        hrs = Math.floor(totalTime / 100);
        mins = totalTime - (hrs * 100);
    }

    state.tokens = state.tokens || [];
    state.tokens.push({
        type: 'time',
        value: {
            hrs: hrs,
            mins: mins
        }
    });

    return state;
}

/**
 * Hack function just to cover some edge cases that are harder to turn into grammer.
 * Eventually I should make this part of the grammer, though.
 *
 * @param state
 * @returns {*}
 */
function checkCommonHours(state) {
    state.tokens = state.tokens || [];
    var text = state.text;

    // do common replacements
    text = text.replace(/eastern standard time/g, 'est');
    text = text.replace(/eastern time/g, 'est');
    text = text.replace(/pacific standard time/g, 'pst');
    text = text.replace(/pacific time/g, 'pst');
    text = text.replace(/mountain standard time/g, 'mst');
    text = text.replace(/mountain time/g, 'mst');
    text = text.replace(/central standard time/g, 'cst');
    text = text.replace(/central time/g, 'cst');
    text = text.replace(/midnight/g, '12am');
    text = text.replace(/â€“/g, 'through');
    text = text.replace(/ã¢â‚¬â€œ/g, 'through');
    text = text.replace(/\//g, ' ');
    text = text.replace('7 days a week', '7 days');
    text = text.replace('seven days a week', '7 days');

    if (text.indexOf('24 hours') > -1) {
        state.tokens.push({
            type: 'time',
            value: {
                allDay: true
            }
        });

        text = text.replace('24 hours', '');
    }

    if (text.indexOf('7 days') > -1) {
        state.tokens.push({
            type: 'days',
            value: utils.daysOfWeek
        });

        text = text.replace('7 days', '');
    }

    state.text = text;
    return state;
}

/**
 * Convert an hours string into a set of tokens
 * @param hoursText
 * @param options
 */
function getTokens(hoursText, options) {

    // no tokens returned if no text
    if (!hoursText) { return []; }

    // state is what we use as we lex
    var state = {
        text: hoursText.toLowerCase(),
        index: 0,
        tokens: []
    };
    var ch, op;

    if (options && options.noLog) {
        state.noLog = true;
    }

    // check the common phrases in the hours
    state = checkCommonHours(state);

    while (state.index < state.text.length) {
        ch = state.text.charAt(state.index);

        if (utils.isLetter(ch)) {
            state = readString(state);
        }
        else if (utils.isNumber(ch)) {
            state = readTime(state);
        }
        else if (utils.isSkip(ch)) {
            state.index++;
        }
        else {
            op = utils.lookupAlias('operations', ch);

            if (op) {
                state.tokens.push({
                    type: 'operation',
                    value: op
                });
            }
            else {
                utils.log('Unexpected character: ' + ch, state);
            }

            state.index++;
        }
    }

    // now we should have all the tokens in the state
    return state.tokens || [];
}

// expose functions
module.exports = {
    readString: readString,
    readTime: readTime,
    checkCommonHours: checkCommonHours,
    getTokens: getTokens
};
},{"./hrsoo.utils":5}],4:[function(require,module,exports){
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

    for (i = (state.tokens.length - 1); i >= 0 ; i--) {
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
        utils.log('Through operation without prev or next', state);
        state.tokens.splice(index, 1);
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

        if ((next.ampm && next.ampm === 'pm') || (!next.ampm && endTime < 800) ||
            (endTime === 1200 && next.ampm === 'am')) {

            endTime += 1200;
        }

        if ((prev.ampm && prev.ampm === 'pm' && startTime < 1200) || (!prev.ampm && startTime < 500)) {
            startTime += 1200;
        }

        // if times the same and both before 12 and second no pm, then move to pm
        if (startTime === endTime && startTime <= 1200 && endTime <= 1200 && (!next.ampm || next.ampm !== 'pm')) {
            endTime += 1200;
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

        while (time < timeRange.end) {
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
},{"./hrsoo.lexer":3,"./hrsoo.utils":5}],5:[function(require,module,exports){
/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Common static helper functions and data that are used by the
 * lexer and parser
 */

var whitespace = [' ', '\r', '\t', '\n', '\v', '\u00A0'];
var ignore = ['.', '(', ')', ',', 'and', ':', 'all', 'times', '&', '#', ';', '|'];
var daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
var aliases = {
    operations: {
        'through':  ['-', '~', 'to', 'thru']
    },
    timezones: {
        est: ['et', 'eastern'],
        cst: ['ct', 'central'],
        mst: ['mt', 'mountain'],
        pst: ['pt', 'pacific']
    },
    days: {
        monday:     ['m', 'mo', 'mon', 'mom'],
        tuesday:    ['t', 'tu', 'tue', 'tues'],
        wednesday:  ['w', 'we', 'wed'],
        thursday:   ['t', 'th', 'thu', 'thur', 'thurs'],
        friday:     ['f', 'fr', 'fri'],
        saturday:   ['s', 'sa', 'sat'],
        sunday:     ['s', 'su', 'sun']
    }
};

/**
 * Check if character is a letter
 * @param ch
 * @returns {boolean}
 */
function isLetter(ch) {
    return (('a' <= ch && ch <= 'z') ||
        ('A' <= ch && ch <= 'Z')) && typeof ch === "string";
}

/**
 * Check if character is a number
 * @param ch
 * @returns {boolean}
 */
function isNumber(ch) {
    return '0' <= ch && ch <= '9' && typeof ch === "string";
}

/**
 * Check if character is one that we skip over
 * @param ch
 * @returns {boolean}
 */
function isSkip(ch) {
    return whitespace.indexOf(ch) > -1 || ignore.indexOf(ch) > -1;
}

/**
 * If the current char is an ignore char
 * @param ch
 * @returns {boolean}
 */
function isIgnore(ch) {
    return ignore.indexOf(ch) > -1;
}

/**
 * Check if string is either am or pm
 * @param str
 * @param prevChar
 * @returns {boolean}
 */
function isAmPm(str, prevChar) {
    return str === 'am' || str === 'pm' ||
        (prevChar && !isNaN(prevChar) && (str === 'a' || str === 'p'));
}

/**
 * Given a particular alias type, see if given string is in there
 * @param aliasType
 * @param str
 * @returns {*}
 */
function lookupAlias(aliasType, str) {
    var lookup = aliases[aliasType] || {};
    var keys = Object.keys(lookup);
    var i, j, key, vals;

    for (i = 0; i < keys.length; i++) {
        key = keys[i];

        if (key === str) {
            return key;
        }

        vals = lookup[key];
        for (j = 0; j < vals.length; j++) {
            if (vals[j] === str) {
                return key;
            }
        }
    }

    return null;
}

/**
 * By default this will simply log messages to the console, but depending on input options,
 * this can also throw errors or potentially do more in the future when issues occur
 * @param str
 * @param state
 */
function log(str, state) {
    state = state || {};

    if (state.logHandler) {
        state.logHandler(str + ' || state = ' + JSON.stringify(state));
    }
    else if (!state.noLog) {
        console.log(str + ' || state = ' + JSON.stringify(state));
    }
}

// exposing properties and functions for this module
module.exports = {
    daysOfWeek: daysOfWeek,
    aliases: aliases,
    isLetter: isLetter,
    isNumber: isNumber,
    isSkip: isSkip,
    isIgnore: isIgnore,
    isAmPm: isAmPm,
    lookupAlias: lookupAlias,
    log: log
};
},{}]},{},[1])(undefined)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvaHJzb28uanMiLCJsaWIvaHJzb28uZm9ybWF0dGVyLmpzIiwibGliL2hyc29vLmxleGVyLmpzIiwibGliL2hyc29vLnBhcnNlci5qcyIsImxpYi9ocnNvby51dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBBdXRob3I6IEplZmYgV2hlbHBsZXlcbiAqIERhdGU6IDQvMi8xNVxuICpcbiAqIE1haW4gaW50ZXJmYWNlIGZvciBocnNvbyB3aGVuIGluY2x1ZGluZyBpdCBpbiBub2RlIG9yIHRoZSBicm93c2VyXG4gKi9cbnZhciBwYXJzZXIgPSByZXF1aXJlKCcuL2hyc29vLnBhcnNlcicpO1xudmFyIGZvcm1hdHRlciA9IHJlcXVpcmUoJy4vaHJzb28uZm9ybWF0dGVyJyk7XG5cbi8vIHdlIGFyZSBvbmx5IGV4cG9zaW5nIGEgY291cGxlIGZ1bmNzIGZyb20gdGhpcyBtb2R1bGVcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHBhcnNlOiAgICAgIHBhcnNlci5wYXJzZSxcbiAgICBzdHJpbmdpZnk6ICBmb3JtYXR0ZXIuc3RyaW5naWZ5LFxuICAgIGZvcm1hdDogICAgIGZvcm1hdHRlci5mb3JtYXRcbn07XG4iLCIvKipcbiAqIEF1dGhvcjogSmVmZiBXaGVscGxleVxuICogRGF0ZTogNC8zLzE1XG4gKlxuICogRm9ybWF0IGEgaHJzb28gb2JqZWN0IGludG8gYSBwYXJ0aWN1bGFyIG91dHB1dCBmb3JtYXRcbiAqL1xudmFyIHBhcnNlciA9IHJlcXVpcmUoJy4vaHJzb28ucGFyc2VyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2hyc29vLnV0aWxzJyk7XG52YXIgdGltZXpvbmVzID0ge1xuICAgIGVzdDogNTAwLFxuICAgIGNzdDogNDAwLFxuICAgIG1zdDogMzAwLFxuICAgIHBzdDogMjAwXG59O1xuXG4vKipcbiAqIEdldCB0aGUgdGltZSBzdHJpbmcgZnJvbSBtaWxpdGFyeSB0aW1lICsgdGltZXpvbmUgZGlmZmVyZW5jZVxuICogQHBhcmFtIHRpbWVcbiAqL1xuZnVuY3Rpb24gZ2V0VGltZVN0cmluZyh0aW1lKSB7XG4gICAgdGltZSA9IHRpbWUgfHwgMDtcblxuICAgIC8vIHplcm8gaXMgdGhlIGZsb29yXG4gICAgaWYgKHRpbWUgPD0gMCkgeyB0aW1lID0gMDsgfVxuXG4gICAgLy8gaWYgdGltZSBpcyAwLCAxMjAwIG9yIDI0MDAsIHJldHVybiBzcGVjaWZpYyBzdHJpbmdcbiAgICBpZiAodGltZSA9PT0gMCB8fCB0aW1lID09PSAyNDAwKSB7XG4gICAgICAgIHJldHVybiAnbWlkbmlnaHQnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aW1lID09PSAxMjAwKSB7XG4gICAgICAgIHJldHVybiAnbm9vbic7XG4gICAgfVxuXG4gICAgdmFyIGhycyA9IE1hdGguZmxvb3IodGltZSAvIDEwMCk7XG4gICAgdmFyIG1pbnMgPSB0aW1lIC0gKGhycyAqIDEwMCk7XG4gICAgdmFyIGFtcG0gPSAoaHJzID4gMTEgJiYgaHJzIDwgMjQpID8gJ3BtJyA6ICdhbSc7XG5cbiAgICBpZiAoaHJzID4gMTIpIHtcbiAgICAgICAgaHJzID0gaHJzIC0gMTI7XG4gICAgfVxuXG4gICAgdmFyIHN0ciA9IGhycztcbiAgICBpZiAobWlucykgeyBzdHIgKz0gJzonICsgbWluczsgfVxuXG4gICAgcmV0dXJuIHN0ciArIGFtcG07XG59XG5cbi8qKlxuICogRm9ybWF0IHRpbWUgYmFzZWQgb24gYSB0aW1lIHByb2ZpbGVcbiAqIEBwYXJhbSB0aW1lUHJvZmlsZVxuICogQHBhcmFtIGN1cnJlbnRUaW1lem9uZVxuICogQHBhcmFtIGRlc2lyZWRUaW1lem9uZVxuICovXG5mdW5jdGlvbiBmb3JtYXRUaW1lKHRpbWVQcm9maWxlLCBjdXJyZW50VGltZXpvbmUsIGRlc2lyZWRUaW1lem9uZSkge1xuICAgIGN1cnJlbnRUaW1lem9uZSA9IGN1cnJlbnRUaW1lem9uZSB8fCAnZXN0JztcbiAgICBkZXNpcmVkVGltZXpvbmUgPSBkZXNpcmVkVGltZXpvbmUgfHwgJ2VzdCc7XG5cbiAgICBpZiAoIXRpbWVQcm9maWxlKSB7XG4gICAgICAgIHJldHVybiAnY2xvc2VkJztcbiAgICB9XG4gICAgZWxzZSBpZiAodGltZVByb2ZpbGUuYWxsRGF5KSB7XG4gICAgICAgIHJldHVybiAnYWxsIGRheSc7XG4gICAgfVxuXG4gICAgdmFyIHRpbWV6b25lRGlmZiA9IHRpbWV6b25lc1tkZXNpcmVkVGltZXpvbmVdIC0gdGltZXpvbmVzW2N1cnJlbnRUaW1lem9uZV07XG4gICAgdmFyIHRpbWUgPSAwO1xuICAgIHZhciB0aW1lU3RyID0gJyc7XG4gICAgdmFyIGFsbFRpbWVzU3RyID0gJyc7XG4gICAgdmFyIGdyb3VwU3RhcnRUaW1lID0gbnVsbDtcblxuICAgIHdoaWxlICh0aW1lIDw9IDI0MDApIHtcblxuICAgICAgICAvLyBnZXQgdGltZSBzdHJpbmcgZnJvbSB0aW1lICsgYW0vcG0gYW5kIHRpbWV6b25lIGRpZmZcbiAgICAgICAgdGltZVN0ciA9IGdldFRpbWVTdHJpbmcodGltZSArIHRpbWV6b25lRGlmZik7XG5cbiAgICAgICAgLy8gaWYgdGltZSBzZWxlY3RlZCBhbmQgbm8gZ3JvdXAgdGltZSB5ZXQsIHNldCBpdFxuICAgICAgICBpZiAodGltZVByb2ZpbGVbdGltZSArICcnXSAmJiAhZ3JvdXBTdGFydFRpbWUpIHtcbiAgICAgICAgICAgIGdyb3VwU3RhcnRUaW1lID0gdGltZVN0cjtcbiAgICAgICAgfVxuICAgICAgICAvLyBlbHNlIGlmIGVpdGhlciB3ZSBhcmUgYXQgbWlkbmlnaHQgb3Igbm8gbW9yIHRpbWUgc2VsZWN0ZWQgYW5kIHRoZXJlIGlzIGEgZ3JvdXAgdGltZSwgYWRkIGl0IHRvIHRoZSBzdHJpbmdcbiAgICAgICAgZWxzZSBpZiAoKCF0aW1lUHJvZmlsZVt0aW1lICsgJyddIHx8IHRpbWUgPT09IDI0MDApICYmIGdyb3VwU3RhcnRUaW1lKSB7XG4gICAgICAgICAgICBpZiAoYWxsVGltZXNTdHIpIHsgYWxsVGltZXNTdHIgKz0gJywgJzsgfVxuICAgICAgICAgICAgYWxsVGltZXNTdHIgKz0gZ3JvdXBTdGFydFRpbWUgKyAnLScgKyB0aW1lU3RyO1xuICAgICAgICAgICAgZ3JvdXBTdGFydFRpbWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCh0aW1lICUgMTAwKSA9PT0gMCkge1xuICAgICAgICAgICAgdGltZSArPSAzMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRpbWUgKz0gNzA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYWxsVGltZXNTdHIgPyBhbGxUaW1lc1N0ciA6ICdjbG9zZWQnO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYW4gaG91cnMgb2JqZWN0IHRvIGEgZm9ybWF0dGVkIHN0cmluZ1xuICogQHBhcmFtIGhvdXJzT2JqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeShob3Vyc09iaiwgb3B0aW9ucykge1xuICAgIGhvdXJzT2JqID0gaG91cnNPYmogfHwge307XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB2YXIgdHlwZSA9IG9wdGlvbnMudHlwZSB8fCAnbWVkaXVtJztcblxuICAgIC8vIHNwZWNpYWwgY2FzZSBmb3IgMjQtN1xuICAgIGlmIChob3Vyc09iai5ldmVyeURheUFsbFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHR5cGUgPT09ICdzaG9ydCcgPyAnMjQtNycgOiAnMjQgaG91cnMsIDcgZGF5cyc7XG4gICAgfVxuXG4gICAgdmFyIGN1cnJlbnRUaW1lem9uZSA9IGhvdXJzT2JqLnRpbWV6b25lIHx8ICdlc3QnO1xuICAgIHZhciBkZXNpcmVkVGltZXpvbmUgPSBvcHRpb25zLnRpbWV6b25lIHx8IGN1cnJlbnRUaW1lem9uZTtcbiAgICB2YXIgZGF5c09mV2VlayA9IHV0aWxzLmRheXNPZldlZWs7XG4gICAgdmFyIGFsaWFzZXMgPSB1dGlscy5hbGlhc2VzLmRheXM7XG4gICAgdmFyIG91dHB1dFN0ciA9ICcnO1xuICAgIHZhciBncm91cFRpbWUgPSBudWxsO1xuICAgIHZhciBncm91cFN0YXJ0RGF5ID0gbnVsbDtcbiAgICB2YXIgcHJldkRheUZvcm1hdHRlZCA9IG51bGw7XG4gICAgdmFyIGRheSwgZGF5Rm9ybWF0dGVkLCB0aW1lRm9ybWF0dGVkO1xuXG4gICAgLy8gZ28gdGhyb3VnaCB0aGUgZGF5cyBvZiB0aGUgd2Vla1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNzsgaSsrKSB7XG4gICAgICAgIGRheSA9IGRheXNPZldlZWtbaV07XG5cbiAgICAgICAgZGF5Rm9ybWF0dGVkID0gdHlwZSA9PT0gJ3Nob3J0JyA/IGFsaWFzZXNbZGF5XVswXSA6XG4gICAgICAgICAgICB0eXBlID09PSAnbWVkaXVtJyA/IGFsaWFzZXNbZGF5XVsyXSA6IGRheTtcbiAgICAgICAgZGF5Rm9ybWF0dGVkID0gZGF5Rm9ybWF0dGVkLnN1YnN0cmluZygwLCAxKS50b1VwcGVyQ2FzZSgpICsgZGF5Rm9ybWF0dGVkLnN1YnN0cmluZygxKTtcblxuICAgICAgICB0aW1lRm9ybWF0dGVkID0gaG91cnNPYmpbZGF5XSA/XG4gICAgICAgICAgICBmb3JtYXRUaW1lKGhvdXJzT2JqW2RheV0sIGN1cnJlbnRUaW1lem9uZSwgZGVzaXJlZFRpbWV6b25lKSA6ICdjbG9zZWQnO1xuXG4gICAgICAgIGlmIChob3Vyc09iai5pc0FsbFdlZWtTYW1lVGltZSkge1xuICAgICAgICAgICAgb3V0cHV0U3RyID0gdGltZUZvcm1hdHRlZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFncm91cFRpbWUpIHtcbiAgICAgICAgICAgIGdyb3VwVGltZSA9IHRpbWVGb3JtYXR0ZWQ7XG4gICAgICAgICAgICBncm91cFN0YXJ0RGF5ID0gZGF5Rm9ybWF0dGVkO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRpbWVGb3JtYXR0ZWQgIT09IGdyb3VwVGltZSkge1xuXG4gICAgICAgICAgICBpZiAoZ3JvdXBUaW1lICE9PSAnY2xvc2VkJykge1xuICAgICAgICAgICAgICAgIGlmIChvdXRwdXRTdHIpIHsgb3V0cHV0U3RyICs9ICcsICc7IH1cbiAgICAgICAgICAgICAgICBvdXRwdXRTdHIgKz0gZ3JvdXBTdGFydERheTtcbiAgICAgICAgICAgICAgICBpZiAocHJldkRheUZvcm1hdHRlZCAhPT0gZ3JvdXBTdGFydERheSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXRTdHIgKz0gJy0nICsgcHJldkRheUZvcm1hdHRlZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0U3RyICs9ICcgJyArIGdyb3VwVGltZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbm93IHJlc2V0IHZhbHVlcyB3aXRoIGN1cnJlbnRcbiAgICAgICAgICAgIGdyb3VwU3RhcnREYXkgPSBkYXlGb3JtYXR0ZWQ7XG4gICAgICAgICAgICBncm91cFRpbWUgPSB0aW1lRm9ybWF0dGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJldkRheUZvcm1hdHRlZCA9IGRheUZvcm1hdHRlZDtcbiAgICB9XG5cbiAgICAvLyBuZWVkIHRvIGRvIGxhc3QgZGF5IHdoaWNoIGlzIG5vdCBpbiB0aGUgbG9vcFxuICAgIGlmIChncm91cFRpbWUgJiYgZ3JvdXBUaW1lICE9PSAnY2xvc2VkJykge1xuICAgICAgICBpZiAob3V0cHV0U3RyKSB7IG91dHB1dFN0ciArPSAnLCAnOyB9XG4gICAgICAgIG91dHB1dFN0ciArPSBncm91cFN0YXJ0RGF5O1xuICAgICAgICBpZiAocHJldkRheUZvcm1hdHRlZCAhPT0gZ3JvdXBTdGFydERheSkge1xuICAgICAgICAgICAgb3V0cHV0U3RyICs9ICctJyArIHByZXZEYXlGb3JtYXR0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgb3V0cHV0U3RyICs9ICcgJyArIGdyb3VwVGltZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0U3RyICsgJyAnICsgZGVzaXJlZFRpbWV6b25lLnRvVXBwZXJDYXNlKCk7XG59XG5cbi8qKlxuICogU2ltcGxlIG9iamVjdCB0aGF0IHR1cm5zIGhycyBvZiBvcGVyYXRpb24gdGV4dCB0byBhbiBvYmplY3QgYW5kXG4gKiB0aGVuIHN0cmluZ2lmaWVzIHRoZSBvYmplY3Qgd2l0aCBhIHBhcnRpY3VsYXIgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBocnNUZXh0XG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGZvcm1hdChocnNUZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIGhyc09iaiA9IHBhcnNlci5wYXJzZShocnNUZXh0LCBvcHRpb25zKTtcbiAgICByZXR1cm4gc3RyaW5naWZ5KGhyc09iaiwgb3B0aW9ucyk7XG59XG5cbi8vIGV4cG9zZSBmdW5jdGlvbnNcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldFRpbWVTdHJpbmc6IGdldFRpbWVTdHJpbmcsXG4gICAgZm9ybWF0VGltZTogZm9ybWF0VGltZSxcbiAgICBzdHJpbmdpZnk6IHN0cmluZ2lmeSxcbiAgICBmb3JtYXQ6IGZvcm1hdFxufTsiLCIvKipcbiAqIEF1dGhvcjogSmVmZiBXaGVscGxleVxuICogRGF0ZTogNC8zLzE1XG4gKlxuICogR29hbCBvZiB0aGlzIG1vZHVsZSBpcyB0byB0YWtlIGEgc3RyaW5nIHdpdGggaG91cnMgb2Ygb3BlcmF0aW9uXG4gKiBhbmQgb3V0cHV0IGEgc2V0IG9mIHRva2VucyB0aGF0IGNhbiBiZSB1c2VkIGJ5IHRoZSBwYXJzZXJcbiAqL1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9ocnNvby51dGlscycpO1xuXG4vKipcbiAqIFJlYWQgb25lIHN0cmluZyBvZiBsZXR0ZXJzXG4gKiBAcGFyYW0gc3RhdGVcbiAqL1xuZnVuY3Rpb24gcmVhZFN0cmluZyhzdGF0ZSkge1xuXG4gICAgLy8gZG8gbm90aGluZyBpZiBub3QgdGhlIHJpZ2h0IHBhcmFtc1xuICAgIGlmICghc3RhdGUgfHwgIXN0YXRlLnRleHQpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cblxuICAgIHZhciBsZW4gPSBzdGF0ZS50ZXh0Lmxlbmd0aDtcbiAgICB2YXIgaW5kZXggPSBzdGF0ZS5pbmRleCB8fCAwO1xuICAgIHZhciBzdHIgPSAnJztcbiAgICB2YXIgY2g7XG4gICAgdmFyIHByZXZDaGFyID0gaW5kZXggPiAwID8gc3RhdGUudGV4dC5jaGFyQXQoaW5kZXggLSAxKSA6IG51bGw7XG5cbiAgICAvLyBnZXQgb25lIHdvcmQgKGkuZS4gdW50aWwgbm90IGEgbGV0dGVyKVxuICAgIHdoaWxlIChpbmRleCA8IGxlbikge1xuICAgICAgICBjaCA9IHN0YXRlLnRleHQuY2hhckF0KGluZGV4KTtcblxuICAgICAgICBpZiAoIXV0aWxzLmlzSWdub3JlKGNoKSkge1xuICAgICAgICAgICAgaWYgKCF1dGlscy5pc0xldHRlcihjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5kZXgrKztcbiAgICB9XG4gICAgc3RhdGUuaW5kZXggPSBpbmRleDtcblxuICAgIC8vIGlmIG5vIHN0cmluZywgdGhlbiBqdXN0IHJldHVybiBoZXJlXG4gICAgaWYgKCFzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cblxuICAgIHN0ciA9IHN0ci50b0xvd2VyQ2FzZSgpO1xuICAgIHN0YXRlLnRva2VucyA9IHN0YXRlLnRva2VucyB8fCBbXTtcblxuICAgIHZhciB0aW1lem9uZSA9IHV0aWxzLmxvb2t1cEFsaWFzKCd0aW1lem9uZXMnLCBzdHIpO1xuICAgIHZhciBkYXkgPSB1dGlscy5sb29rdXBBbGlhcygnZGF5cycsIHN0cik7XG4gICAgdmFyIG9wID0gdXRpbHMubG9va3VwQWxpYXMoJ29wZXJhdGlvbnMnLCBzdHIpO1xuXG4gICAgaWYgKHV0aWxzLmlzQW1QbShzdHIsIHByZXZDaGFyKSkge1xuICAgICAgICBpZiAoc3RyID09PSAnYScpIHsgc3RyID0gJ2FtJzsgfVxuICAgICAgICBpZiAoc3RyID09PSAncCcpIHsgc3RyID0gJ3BtJzsgfVxuICAgICAgICBzdGF0ZS50b2tlbnMucHVzaCh7IHR5cGU6ICdhbXBtJywgdmFsdWU6IHN0ciB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGltZXpvbmUpIHtcbiAgICAgICAgc3RhdGUudG9rZW5zLnB1c2goeyB0eXBlOiAndGltZXpvbmUnLCB2YWx1ZTogdGltZXpvbmUgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKG9wKSB7XG4gICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHsgdHlwZTogJ29wZXJhdGlvbicsIHZhbHVlOiBvcCB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZGF5KSB7XG4gICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHsgdHlwZTogJ2RheXMnLCB2YWx1ZTogW2RheV0gfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0ciA9PT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgc3RhdGUudG9rZW5zLnB1c2goeyB0eXBlOiAndGltZScsIHZhbHVlOiB7IGlzQ2xvc2VkOiB0cnVlIH19KTtcbiAgICB9XG4gICAgLy9lbHNlIGlmICghdXRpbHMuaXNJZ25vcmUoc3RyKSkge1xuICAgIC8vICAgIHV0aWxzLmxvZygnVW5rbm93biBzdHJpbmcgJyArIHN0ciwgc3RhdGUpO1xuICAgIC8vfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIFJlYWQgZGlnaXRzIGFuZCA6IHRvIGdldCBhIHRpbWVcbiAqIEBwYXJhbSBzdGF0ZVxuICovXG5mdW5jdGlvbiByZWFkVGltZShzdGF0ZSkge1xuICAgIHZhciB0aW1lID0gJzAnO1xuICAgIHZhciBjaCwgaHJzLCBtaW5zO1xuICAgIHZhciBjb2xvbkZvdW5kID0gZmFsc2U7XG4gICAgdmFyIGNoYXJDb3VudCA9IDA7XG5cbiAgICB3aGlsZSAoc3RhdGUuaW5kZXggPCBzdGF0ZS50ZXh0Lmxlbmd0aCkge1xuICAgICAgICBjaCA9IHN0YXRlLnRleHQuY2hhckF0KHN0YXRlLmluZGV4KTtcblxuICAgICAgICBpZiAoY2ggPT09ICc6JyB8fCAoIWNvbG9uRm91bmQgJiYgY2hhckNvdW50IDwgMyAmJiBjaCA9PT0gJy4nKSkge1xuICAgICAgICAgICAgY29sb25Gb3VuZCA9IHRydWU7XG4gICAgICAgICAgICBocnMgPSBwYXJzZUludCh0aW1lKTtcbiAgICAgICAgICAgIHRpbWUgPSAnMCc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIXV0aWxzLmlzTnVtYmVyKGNoKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aW1lICs9IGNoO1xuICAgICAgICB9XG5cbiAgICAgICAgY2hhckNvdW50Kys7XG4gICAgICAgIHN0YXRlLmluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKGhycykge1xuICAgICAgICBtaW5zID0gcGFyc2VJbnQodGltZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBocnMgPSBwYXJzZUludCh0aW1lKTtcbiAgICAgICAgbWlucyA9IDA7XG4gICAgfVxuXG4gICAgLy8gaW4gdGhpcyBzaXR1YXRpb24gdGhlIHBlcnNvbiBmb3Jnb3QgdGhlIGNvbG9uXG4gICAgaWYgKGhycyA+IDEyICYmICFjb2xvbkZvdW5kICYmIChocnMgKyAnJykubGVuZ3RoID4gMikge1xuICAgICAgICB2YXIgdG90YWxUaW1lID0gaHJzO1xuICAgICAgICBocnMgPSBNYXRoLmZsb29yKHRvdGFsVGltZSAvIDEwMCk7XG4gICAgICAgIG1pbnMgPSB0b3RhbFRpbWUgLSAoaHJzICogMTAwKTtcbiAgICB9XG5cbiAgICBzdGF0ZS50b2tlbnMgPSBzdGF0ZS50b2tlbnMgfHwgW107XG4gICAgc3RhdGUudG9rZW5zLnB1c2goe1xuICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICBocnM6IGhycyxcbiAgICAgICAgICAgIG1pbnM6IG1pbnNcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEhhY2sgZnVuY3Rpb24ganVzdCB0byBjb3ZlciBzb21lIGVkZ2UgY2FzZXMgdGhhdCBhcmUgaGFyZGVyIHRvIHR1cm4gaW50byBncmFtbWVyLlxuICogRXZlbnR1YWxseSBJIHNob3VsZCBtYWtlIHRoaXMgcGFydCBvZiB0aGUgZ3JhbW1lciwgdGhvdWdoLlxuICpcbiAqIEBwYXJhbSBzdGF0ZVxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNoZWNrQ29tbW9uSG91cnMoc3RhdGUpIHtcbiAgICBzdGF0ZS50b2tlbnMgPSBzdGF0ZS50b2tlbnMgfHwgW107XG4gICAgdmFyIHRleHQgPSBzdGF0ZS50ZXh0O1xuXG4gICAgLy8gZG8gY29tbW9uIHJlcGxhY2VtZW50c1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL2Vhc3Rlcm4gc3RhbmRhcmQgdGltZS9nLCAnZXN0Jyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvZWFzdGVybiB0aW1lL2csICdlc3QnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9wYWNpZmljIHN0YW5kYXJkIHRpbWUvZywgJ3BzdCcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL3BhY2lmaWMgdGltZS9nLCAncHN0Jyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvbW91bnRhaW4gc3RhbmRhcmQgdGltZS9nLCAnbXN0Jyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvbW91bnRhaW4gdGltZS9nLCAnbXN0Jyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvY2VudHJhbCBzdGFuZGFyZCB0aW1lL2csICdjc3QnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9jZW50cmFsIHRpbWUvZywgJ2NzdCcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL21pZG5pZ2h0L2csICcxMmFtJyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvw6LigqzigJwvZywgJ3Rocm91Z2gnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC/Do8Kiw6LigJrCrMOi4oKsxZMvZywgJ3Rocm91Z2gnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8vZywgJyAnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKCc3IGRheXMgYSB3ZWVrJywgJzcgZGF5cycpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoJ3NldmVuIGRheXMgYSB3ZWVrJywgJzcgZGF5cycpO1xuXG4gICAgaWYgKHRleHQuaW5kZXhPZignMjQgaG91cnMnKSA+IC0xKSB7XG4gICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgYWxsRGF5OiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoJzI0IGhvdXJzJywgJycpO1xuICAgIH1cblxuICAgIGlmICh0ZXh0LmluZGV4T2YoJzcgZGF5cycpID4gLTEpIHtcbiAgICAgICAgc3RhdGUudG9rZW5zLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogJ2RheXMnLFxuICAgICAgICAgICAgdmFsdWU6IHV0aWxzLmRheXNPZldlZWtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgnNyBkYXlzJywgJycpO1xuICAgIH1cblxuICAgIHN0YXRlLnRleHQgPSB0ZXh0O1xuICAgIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGhvdXJzIHN0cmluZyBpbnRvIGEgc2V0IG9mIHRva2Vuc1xuICogQHBhcmFtIGhvdXJzVGV4dFxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gZ2V0VG9rZW5zKGhvdXJzVGV4dCwgb3B0aW9ucykge1xuXG4gICAgLy8gbm8gdG9rZW5zIHJldHVybmVkIGlmIG5vIHRleHRcbiAgICBpZiAoIWhvdXJzVGV4dCkgeyByZXR1cm4gW107IH1cblxuICAgIC8vIHN0YXRlIGlzIHdoYXQgd2UgdXNlIGFzIHdlIGxleFxuICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgdGV4dDogaG91cnNUZXh0LnRvTG93ZXJDYXNlKCksXG4gICAgICAgIGluZGV4OiAwLFxuICAgICAgICB0b2tlbnM6IFtdXG4gICAgfTtcbiAgICB2YXIgY2gsIG9wO1xuXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5ub0xvZykge1xuICAgICAgICBzdGF0ZS5ub0xvZyA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgdGhlIGNvbW1vbiBwaHJhc2VzIGluIHRoZSBob3Vyc1xuICAgIHN0YXRlID0gY2hlY2tDb21tb25Ib3VycyhzdGF0ZSk7XG5cbiAgICB3aGlsZSAoc3RhdGUuaW5kZXggPCBzdGF0ZS50ZXh0Lmxlbmd0aCkge1xuICAgICAgICBjaCA9IHN0YXRlLnRleHQuY2hhckF0KHN0YXRlLmluZGV4KTtcblxuICAgICAgICBpZiAodXRpbHMuaXNMZXR0ZXIoY2gpKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IHJlYWRTdHJpbmcoc3RhdGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHV0aWxzLmlzTnVtYmVyKGNoKSkge1xuICAgICAgICAgICAgc3RhdGUgPSByZWFkVGltZShzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodXRpbHMuaXNTa2lwKGNoKSkge1xuICAgICAgICAgICAgc3RhdGUuaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9wID0gdXRpbHMubG9va3VwQWxpYXMoJ29wZXJhdGlvbnMnLCBjaCk7XG5cbiAgICAgICAgICAgIGlmIChvcCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29wZXJhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBvcFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbHMubG9nKCdVbmV4cGVjdGVkIGNoYXJhY3RlcjogJyArIGNoLCBzdGF0ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0YXRlLmluZGV4Kys7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgd2Ugc2hvdWxkIGhhdmUgYWxsIHRoZSB0b2tlbnMgaW4gdGhlIHN0YXRlXG4gICAgcmV0dXJuIHN0YXRlLnRva2VucyB8fCBbXTtcbn1cblxuLy8gZXhwb3NlIGZ1bmN0aW9uc1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVhZFN0cmluZzogcmVhZFN0cmluZyxcbiAgICByZWFkVGltZTogcmVhZFRpbWUsXG4gICAgY2hlY2tDb21tb25Ib3VyczogY2hlY2tDb21tb25Ib3VycyxcbiAgICBnZXRUb2tlbnM6IGdldFRva2Vuc1xufTsiLCIvKipcbiAqIEF1dGhvcjogSmVmZiBXaGVscGxleVxuICogRGF0ZTogNC8zLzE1XG4gKlxuICogVGhpcyBtb2R1bGUgaXMgdXNlZCB0byB0cmFuc2xhdGUgYSBzZXQgb2YgdG9rZW5zIGludG9cbiAqIGFuIHN0YW5kYXJkIEpTT04gb2JqZWN0IHdpdGggaG91cnMgZGF0YVxuICovXG52YXIgbGV4ZXIgPSByZXF1aXJlKCcuL2hyc29vLmxleGVyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2hyc29vLnV0aWxzJyk7XG5cbi8qKlxuICogR28gdGhyb3VnaCBhbmQgcHJvY2VzcyB0aGUgdGltZXpvbmUgdG9rZW4ocylcbiAqIEBwYXJhbSBzdGF0ZVxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIHBhcnNlVGltZXpvbmUoc3RhdGUpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHN0YXRlLnRva2VucyA9IHN0YXRlLnRva2VucyB8fCBbXTtcblxuICAgIHZhciBpLCB0b2tlbiwgdGltZXpvbmU7XG5cbiAgICBmb3IgKGkgPSAoc3RhdGUudG9rZW5zLmxlbmd0aCAtIDEpOyBpID49IDA7IGktLSkge1xuICAgICAgICB0b2tlbiA9IHN0YXRlLnRva2Vuc1tpXTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gJ3RpbWV6b25lJykge1xuICAgICAgICAgICAgaWYgKHRpbWV6b25lICYmIHRva2VuLnZhbHVlICE9PSB0aW1lem9uZSkge1xuICAgICAgICAgICAgICAgIHV0aWxzLmxvZygnTXVsdGlwbGUgdGltZXpvbmVzIGZvdW5kLiBVc2luZyAnICsgdGltZXpvbmUgKyAnIGFuZCBpZ25vcmluZyAnICsgdG9rZW4udmFsdWUsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRpbWV6b25lID0gdG9rZW4udmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgdGltZXpvbmUgdG9rZW4gbm93IHRoYXQgd2UgaGF2ZSBwcm9jZXNzZWQgaXRcbiAgICAgICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0ZS50aW1lem9uZSA9IHRpbWV6b25lIHx8ICdlc3QnOyAgLy8gZXN0IGlzIGRlZmF1bHRcbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogR28gdGhyb3VnaCBhbmQgcHJvY2VzcyB0aGUgYW1wbSB0b2tlbnMuIFRoaXMgaXMgZG9uZSBieSBzaW1wbHkgYXBwbHlpbmdcbiAqIHRoZSBhbSBvciBwbSB0byB0aGUgdG9rZW4gZGlyZWN0bHkgcHJlY2VlZGluZy5cbiAqXG4gKiBAcGFyYW0gc3RhdGVcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBwYXJzZUFtUG0oc3RhdGUpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHN0YXRlLnRva2VucyA9IHN0YXRlLnRva2VucyB8fCBbXTtcblxuICAgIHZhciBpLCB0b2tlbiwgcHJldlRva2VuO1xuXG4gICAgZm9yIChpID0gKHN0YXRlLnRva2Vucy5sZW5ndGggLSAxKTsgaSA+IDA7IGktLSkgeyAgLy8gbm90IGEgbWlzdGFrZSA+IDAgYmVjYXVzZSBhbXBtIHNob3VsZG4ndCBiZSBmaXJzdCB0b2tlblxuICAgICAgICB0b2tlbiA9IHN0YXRlLnRva2Vuc1tpXTtcbiAgICAgICAgcHJldlRva2VuID0gc3RhdGUudG9rZW5zW2kgLSAxXTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gJ2FtcG0nKSB7XG5cbiAgICAgICAgICAgIC8vIG1pc3Rha2UgaWYgcHJldmlvdXMgdG9rZW4gaXMgb3BlcmF0aW9uXG4gICAgICAgICAgICBpZiAocHJldlRva2VuLnR5cGUgPT09ICdvcGVyYXRpb24nKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpIC0gMSwgMSk7XG4gICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmV2VG9rZW4gPSBzdGF0ZS50b2tlbnNbaSAtIDFdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJldlRva2VuLnR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICAgICAgICAgIHByZXZUb2tlbi5hbXBtID0gdG9rZW4udmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGlscy5sb2coJ1ByZXZpb3VzIHRva2VuIGlzICcgKyBwcmV2VG9rZW4udHlwZSArICcgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldlRva2VuLnZhbHVlICsgICcgc28gaWdub3JlIHRpbWV6b25lICcgKyB0b2tlbi52YWx1ZSwgc3RhdGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB3ZSBoYXZlIHVzZWQgdGhlIHZhbHVlIHNvIHJlbW92ZSBpdFxuICAgICAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBJZiBqdXN0IHR3byB0aW1lIHRva2VucyB3aXRoIHRocm91Z2gsIHRoZW4gYXNzdW1lIGFsbCB3ZWVrXG4gKiBAcGFyYW0gc3RhdGVcbiAqL1xuZnVuY3Rpb24gdGltZUFsbFdlZWsoc3RhdGUpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHZhciB0b2tlbnMgPSBzdGF0ZS50b2tlbnM7XG5cbiAgICAvLyBpZiBqdXN0IG9uZSB0b2tlbiB3aXRoIHRpbWUgYWRkIGEgdGhyb3VnaCB0b2tlblxuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSAyICYmIHRva2Vuc1swXS50eXBlID09PSAndGltZScgJiYgdG9rZW5zWzFdLnR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICB0b2tlbnMuc3BsaWNlKDEsIDAsIHtcbiAgICAgICAgICAgIHR5cGU6ICAgJ29wZXJhdGlvbicsXG4gICAgICAgICAgICB2YWx1ZTogICd0aHJvdWdoJ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBub3cgaWYgdGhyZWUgdG9rZW5zIHRoYXQgZ28gdGltZSwgdGhyb3VnaCwgdGltZSwgdGhlbiB3ZSBhc3N1bWUgYWxsIHdlZWtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gMyAmJlxuICAgICAgICB0b2tlbnNbMF0udHlwZSA9PT0gJ3RpbWUnICYmXG4gICAgICAgIHRva2Vuc1sxXS50eXBlID09PSAnb3BlcmF0aW9uJyAmJiB0b2tlbnNbMV0udmFsdWUgPT09ICd0aHJvdWdoJyAmJlxuICAgICAgICB0b2tlbnNbMl0udHlwZSA9PT0gJ3RpbWUnKSB7XG5cbiAgICAgICAgdG9rZW5zLnNwbGljZSgwLCAwLCB7XG4gICAgICAgICAgICB0eXBlOiAnZGF5cycsXG4gICAgICAgICAgICB2YWx1ZTogdXRpbHMuZGF5c09mV2Vla1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogRXhlY3V0ZSBhbGwgdG9rZW5zIHRoYXQgd2l0aCB0aGUgZ2l2ZW4gb3BlcmF0aW9uXG4gKiBAcGFyYW0gc3RhdGVcbiAqIEBwYXJhbSBvcE5hbWVcbiAqIEBwYXJhbSBvcEZuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gZG9PcGVyYXRpb25zKHN0YXRlLCBvcE5hbWUsIG9wRm4pIHtcbiAgICB2YXIgaSwgdG9rZW47XG5cbiAgICBmb3IgKGkgPSAoc3RhdGUudG9rZW5zLmxlbmd0aCAtIDEpOyBpID49IDAgOyBpLS0pIHtcbiAgICAgICAgdG9rZW4gPSBzdGF0ZS50b2tlbnNbaV07XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09ICdvcGVyYXRpb24nICYmIHRva2VuLnZhbHVlID09PSBvcE5hbWUpIHtcbiAgICAgICAgICAgIHN0YXRlID0gb3BGbihzdGF0ZSwgaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogVGhpcyB3aWxsIHByb2Nlc3MgYW55IFwidGhyb3VnaFwiIHRva2VuIHdoaWNoIG1lYW5zIHRoYXQgc29tZW9uZVxuICogd2FzIGRvaW5nIGEgcmFuZ2UgYmV0d2VlbiB0d28gdmFsdWVzIChlaXRoZXIgZGF5cyBvciB0aW1lcykuXG4gKlxuICogQHBhcmFtIHN0YXRlXG4gKiBAcGFyYW0gaW5kZXhcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiB0aHJvdWdoT3Aoc3RhdGUsIGluZGV4KSB7XG5cbiAgICAvLyBpZiB0aHJvdWdoIGlzIGZpcnN0IG9yIGxhc3QgdG9rZW4sIHdlIGNhbid0IGRvIGFueXRoaW5nIHNvIHJlbW92ZSBpdCBhbmQgZ28gb25cbiAgICBpZiAoaW5kZXggPCAxIHx8IGluZGV4ID4gKHN0YXRlLnRva2Vucy5sZW5ndGggLSAyKSkge1xuICAgICAgICB1dGlscy5sb2coJ1Rocm91Z2ggb3BlcmF0aW9uIHdpdGhvdXQgcHJldiBvciBuZXh0Jywgc3RhdGUpO1xuICAgICAgICBzdGF0ZS50b2tlbnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cblxuICAgIC8vIGdldCB0aGUgcHJldmlvdXMgYW5kIG5leHQgdG9rZW5zIGZvciBwcm9jZXNzaW5nXG4gICAgdmFyIHByZXYgPSBzdGF0ZS50b2tlbnNbaW5kZXggLSAxXTtcbiAgICB2YXIgbmV4dCA9IHN0YXRlLnRva2Vuc1tpbmRleCArIDFdO1xuICAgIHZhciBpLCBzdGFydERheUlkeCwgZW5kRGF5SWR4LCBzdGFydFRpbWUsIGVuZFRpbWU7XG5cbiAgICAvLyBpZiB0eXBlcyBkb24ndCBtYXRjaCBvciBub3QgZGF5IG9yIHRpbWUsIHRoZW4ganVzdCByZW1vdmUgdGhpcyB0b2tlbiBhbmQgaWdub3JlXG4gICAgaWYgKHByZXYudHlwZSAhPT0gbmV4dC50eXBlIHx8IChwcmV2LnR5cGUgIT09ICdkYXlzJyAmJiBwcmV2LnR5cGUgIT09ICd0aW1lJykpIHtcbiAgICAgICAgLy91dGlscy5sb2coJ1Rocm91Z2ggb3BlcmF0aW9uIHByZXZpb3VzICcgKyBwcmV2LnR5cGUgKyAnIG5leHQgJyArIG5leHQudHlwZSwgc3RhdGUpO1xuICAgICAgICBzdGF0ZS50b2tlbnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgICBlbHNlIGlmIChwcmV2LnR5cGUgPT09ICdkYXlzJykge1xuXG4gICAgICAgIGlmICghcHJldi52YWx1ZS5sZW5ndGggfHwgIW5leHQudmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICB1dGlscy5sb2coJ05vIGRheXMgaW4gcHJldiBvciBuZXh0Jywgc3RhdGUpO1xuICAgICAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH1cblxuICAgICAgICBzdGFydERheUlkeCA9IHV0aWxzLmRheXNPZldlZWsuaW5kZXhPZihwcmV2LnZhbHVlWzBdKTtcbiAgICAgICAgZW5kRGF5SWR4ID0gdXRpbHMuZGF5c09mV2Vlay5pbmRleE9mKG5leHQudmFsdWVbMF0pO1xuXG4gICAgICAgIGlmIChzdGFydERheUlkeCA8IDAgfHwgZW5kRGF5SWR4IDwgMSkge1xuICAgICAgICAgICAgdXRpbHMubG9nKCdTdGFydCBvciBlbmQgZGF5IGRvZXMgbm90IGV4aXN0Jywgc3RhdGUpO1xuICAgICAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICAgIH1cblxuICAgICAgICBwcmV2LnZhbHVlID0gW107XG4gICAgICAgIGZvciAoaSA9IHN0YXJ0RGF5SWR4OyAoaSA8PSBlbmREYXlJZHggJiYgaSA8IHV0aWxzLmRheXNPZldlZWsubGVuZ3RoKTsgaSsrKSB7XG4gICAgICAgICAgICBwcmV2LnZhbHVlLnB1c2godXRpbHMuZGF5c09mV2Vla1tpXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGlzIGNhbiBoYXBwZW4gd2l0aCBzYXQgLSBzdW5cbiAgICAgICAgaWYgKGVuZERheUlkeCA8IHN0YXJ0RGF5SWR4KSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDw9IGVuZERheUlkeDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcHJldi52YWx1ZS5wdXNoKHV0aWxzLmRheXNPZldlZWtbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVtb3ZlIHRocm91Z2ggYW5kIG5leHQgaW5kZXhcbiAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpbmRleCwgMik7XG4gICAgfVxuICAgIGVsc2UgaWYgKHByZXYudHlwZSA9PT0gJ3RpbWUnKSB7XG4gICAgICAgIHByZXYudmFsdWUgPSBwcmV2LnZhbHVlIHx8IHt9O1xuICAgICAgICBuZXh0LnZhbHVlID0gbmV4dC52YWx1ZSB8fCB7fTtcblxuICAgICAgICBzdGFydFRpbWUgPSAocHJldi52YWx1ZS5ocnMgfHwgMCkgKiAxMDAgKyAocHJldi52YWx1ZS5taW5zIHx8IDApO1xuICAgICAgICBlbmRUaW1lID0gKG5leHQudmFsdWUuaHJzIHx8IDApICogMTAwICsgKG5leHQudmFsdWUubWlucyB8fCAwKTtcblxuICAgICAgICBpZiAoKG5leHQuYW1wbSAmJiBuZXh0LmFtcG0gPT09ICdwbScpIHx8ICghbmV4dC5hbXBtICYmIGVuZFRpbWUgPCA4MDApIHx8XG4gICAgICAgICAgICAoZW5kVGltZSA9PT0gMTIwMCAmJiBuZXh0LmFtcG0gPT09ICdhbScpKSB7XG5cbiAgICAgICAgICAgIGVuZFRpbWUgKz0gMTIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgocHJldi5hbXBtICYmIHByZXYuYW1wbSA9PT0gJ3BtJyAmJiBzdGFydFRpbWUgPCAxMjAwKSB8fCAoIXByZXYuYW1wbSAmJiBzdGFydFRpbWUgPCA1MDApKSB7XG4gICAgICAgICAgICBzdGFydFRpbWUgKz0gMTIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHRpbWVzIHRoZSBzYW1lIGFuZCBib3RoIGJlZm9yZSAxMiBhbmQgc2Vjb25kIG5vIHBtLCB0aGVuIG1vdmUgdG8gcG1cbiAgICAgICAgaWYgKHN0YXJ0VGltZSA9PT0gZW5kVGltZSAmJiBzdGFydFRpbWUgPD0gMTIwMCAmJiBlbmRUaW1lIDw9IDEyMDAgJiYgKCFuZXh0LmFtcG0gfHwgbmV4dC5hbXBtICE9PSAncG0nKSkge1xuICAgICAgICAgICAgZW5kVGltZSArPSAxMjAwO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZW5kVGltZSBjYW4gYmUgYmVmb3JlIHN0YXJ0VGltZSBpbiBzaXR1YXRpb25zIHdoZXJlIGVuZCB0aW1lIGlzIGxhdGUgYXQgbmlnaHQgKGV4LiA4YW0gLSAyYW0pXG4gICAgICAgIGlmIChlbmRUaW1lID4gMzAwICYmIHN0YXJ0VGltZSA+PSBlbmRUaW1lKSB7XG4gICAgICAgICAgICB1dGlscy5sb2coJ1N0YXJ0IHRpbWUgJyArIHN0YXJ0VGltZSArICcgbXVzdCBiZSBiZWZvcmUgZW5kIHRpbWUgJyArIGVuZFRpbWUsIHN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlcGxhY2UgcHJldiB0b2tlbiB2YWx1ZSB3aXRoIHRpbWUgcmFuZ2VcbiAgICAgICAgcHJldi52YWx1ZSA9IHtcbiAgICAgICAgICAgIHJhbmdlczogW3tcbiAgICAgICAgICAgICAgICBzdGFydDogc3RhcnRUaW1lLFxuICAgICAgICAgICAgICAgIGVuZDogZW5kVGltZVxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICAgICAgZGVsZXRlIHByZXYuYW1wbTtcblxuICAgICAgICAvLyByZW1vdmUgdGhlIHRocm91Z2ggdG9rZW4gYW5kIHRoZSBzZWNvbmQgdGltZSB0b2tlbiB3aGljaCBhcmVuJ3QgbmVlZGVkIGFueW1vcmVcbiAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpbmRleCwgMik7XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuIHRoZSBsYXRlc3Qgc3RhdGVcbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQ29tYmluZSBkYXlzIHdpdGggYWRqYWNlbnQgZGF5cyBhbmQgdGltZXMgd2l0aCBhZGphY2VudCB0aW1lc1xuICogQHBhcmFtIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGNvbXByZXNzRGF5VGltZXMoc3RhdGUpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHZhciB0b2tlbnMgPSBzdGF0ZS50b2tlbnMgfHwgW107XG5cbiAgICAvLyBub3QgYXQgbGVhc3QgdHdvIHRva2VucywgcmV0dXJuIHJpZ2h0IGF3YXlcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IDIpIHsgcmV0dXJuIHN0YXRlOyB9XG5cbiAgICB2YXIgcHJldlRva2VuLCBjdXJyZW50VG9rZW4sIGk7XG5cbiAgICBmb3IgKGkgPSAodG9rZW5zLmxlbmd0aCAtIDEpOyBpID4gMDsgaS0tKSB7XG4gICAgICAgIHByZXZUb2tlbiA9IHRva2Vuc1tpIC0gMV07XG4gICAgICAgIGN1cnJlbnRUb2tlbiA9IHRva2Vuc1tpXTtcblxuICAgICAgICAvLyBpZiBob3VycyBsaXN0ZWQgYXQgdGhpcyBwb2ludCwgbG9nIGl0IGJlY2F1c2UgdGhleSBzaG91bGQgYmUgcmFuZ2VzXG4gICAgICAgIGlmIChpID09PSAxICYmIHByZXZUb2tlbi52YWx1ZS5ob3Vycykge1xuICAgICAgICAgICAgdXRpbHMubG9nKCdUb2tlbiAnICsgKGkgLSAxKSArICcgaGFzIGhvdXJzIGluIGNvbXByZXNzRGF5VGltZXMnLCBzdGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnJlbnRUb2tlbi52YWx1ZS5ob3Vycykge1xuICAgICAgICAgICAgdXRpbHMubG9nKCdUb2tlbiAnICsgaSArICcgaGFzIGhvdXJzIGluIGNvbXByZXNzRGF5VGltZXMnLCBzdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJldlRva2VuLnR5cGUgPT09ICd0aW1lJyAmJiAhcHJldlRva2VuLnZhbHVlLmlzQ2xvc2VkICYmXG4gICAgICAgICAgICBjdXJyZW50VG9rZW4udHlwZSA9PT0gJ3RpbWUnICYmICFjdXJyZW50VG9rZW4udmFsdWUuaXNDbG9zZWQpIHtcblxuICAgICAgICAgICAgLy8gY29uY2F0IHRoZSByYW5nZXNcbiAgICAgICAgICAgIHByZXZUb2tlbi52YWx1ZS5yYW5nZXMgPSBwcmV2VG9rZW4udmFsdWUucmFuZ2VzIHx8IFtdO1xuICAgICAgICAgICAgcHJldlRva2VuLnZhbHVlLnJhbmdlcyA9IHByZXZUb2tlbi52YWx1ZS5yYW5nZXMuY29uY2F0KGN1cnJlbnRUb2tlbi52YWx1ZS5yYW5nZXMgfHwgW10pO1xuXG4gICAgICAgICAgICBpZiAoY3VycmVudFRva2VuLnZhbHVlLmFsbERheSkge1xuICAgICAgICAgICAgICAgIHByZXZUb2tlbi52YWx1ZS5hbGxEYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0b2tlbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXZUb2tlbi50eXBlID09PSAnZGF5cycgJiYgY3VycmVudFRva2VuLnR5cGUgPT09ICdkYXlzJykge1xuICAgICAgICAgICAgcHJldlRva2VuLnZhbHVlID0gcHJldlRva2VuLnZhbHVlLmNvbmNhdChjdXJyZW50VG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgdG9rZW5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBDaGFuZ2UgcmFuZ2VzIHRvIGJvb2xlYW5zIGF0IDMwIG1pbiBpbmNyZW1lbnRzXG4gKiBAcGFyYW0gdGltZVJhbmdlc1xuICogQHJldHVybnMge3t9fVxuICovXG5mdW5jdGlvbiBnZXRUaW1lUHJvZmlsZSh0aW1lUmFuZ2VzKSB7XG4gICAgdGltZVJhbmdlcyA9IHRpbWVSYW5nZXMgfHwgW107XG5cbiAgICB2YXIgdGltZVByb2ZpbGUgPSB7fTtcbiAgICB2YXIgaSwgdGltZVJhbmdlLCB0aW1lLCB0aW1lU3RyO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRpbWVSYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGltZVJhbmdlID0gdGltZVJhbmdlc1tpXTtcbiAgICAgICAgdGltZSA9IHRpbWVSYW5nZS5zdGFydDtcblxuICAgICAgICB3aGlsZSAodGltZSA8IHRpbWVSYW5nZS5lbmQpIHtcbiAgICAgICAgICAgIHRpbWVTdHIgPSB0aW1lICsgJyc7XG4gICAgICAgICAgICB0aW1lUHJvZmlsZVt0aW1lU3RyXSA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmICh0aW1lU3RyLnN1YnN0cmluZyh0aW1lU3RyLmxlbmd0aCAtIDIpID09PSAnMDAnKSB7XG4gICAgICAgICAgICAgICAgdGltZSArPSAzMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRpbWUgKz0gNzA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGltZVByb2ZpbGU7XG59XG5cblxuLyoqXG4gKiBDb21iaW5lIGFsbCB0aGUgZGF5cyBhbmQgdGltZXM7IG91dHB1dCBzaG91bGQgYmUgYXJyYXkgb2YgdG9rZW5zIGVhY2ggb2ZcbiAqIHdoaWNoIGNvbnRhaW5zIGFycmF5IG9mIGRheXMgYW5kIGFycmF5IG9mIHRpbWVyYW5nZXMuIElmIHRoZSB0b2tlbnMgYXJlXG4gKiBub3QgbGlzdGVkIGluIHBlcmZlY3QgcGFpcnMgYXQgdGhpcyBwb2ludCAoaS5lLiBkYXlzIHRva2VuIHBhaXJlZCB3aXRoIHRpbWUgdG9rZW4pXG4gKiB0aGVuIHRoZXJlIGlzIGEgcHJvYmxlbS5cbiAqXG4gKiBAcGFyYW0gc3RhdGVcbiAqL1xuZnVuY3Rpb24gZ2V0RGF5VGltZXMoc3RhdGUpIHtcbiAgICB2YXIgZGF5VGltZXMgPSB7fTtcbiAgICB2YXIgdG9rZW5zID0gc3RhdGUudG9rZW5zIHx8IFtdO1xuICAgIHZhciB1cHBlckJvdW5kcnkgPSB0b2tlbnMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIHRpbWVUb2tlbiwgZGF5VG9rZW4sIHRpbWVQcm9maWxlLCBqLCBkYXksIHRpbWU7XG4gICAgdmFyIGlzQWxsRGF5RXZlcnlEYXkgPSB0cnVlO1xuICAgIHZhciBpc1NhbWVUaW1lID0gdHJ1ZTtcbiAgICB2YXIgc2FtZVRpbWUgPSBudWxsO1xuXG4gICAgd2hpbGUgKGkgPCB1cHBlckJvdW5kcnkpIHtcbiAgICAgICAgdGltZVRva2VuID0gc3RhdGUudG9rZW5zW2ldO1xuICAgICAgICBkYXlUb2tlbiA9IHN0YXRlLnRva2Vuc1tpICsgMV07XG5cbiAgICAgICAgLy8gaWYgdG9rZW5zIG5vdCB0aGUgcmlnaHQgdHlwZSwgdHJ5IHRvIGZsaXAgdGhlbVxuICAgICAgICBpZiAodGltZVRva2VuLnR5cGUgIT09ICd0aW1lJyAmJiBkYXlUb2tlbi50eXBlICE9PSAnZGF5cycpIHtcbiAgICAgICAgICAgIHRpbWVUb2tlbiA9IHN0YXRlLnRva2Vuc1tpICsgMV07XG4gICAgICAgICAgICBkYXlUb2tlbiA9IHN0YXRlLnRva2Vuc1tpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0aW1lVG9rZW5TdHIgPSBKU09OLnN0cmluZ2lmeSh0aW1lVG9rZW4pO1xuICAgICAgICBpZiAoIXNhbWVUaW1lKSB7XG4gICAgICAgICAgICBzYW1lVGltZSA9IHRpbWVUb2tlblN0cjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzYW1lVGltZSAhPT0gdGltZVRva2VuU3RyKSB7XG4gICAgICAgICAgICBpc1NhbWVUaW1lID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiBzdGlsbCBub3QgdGhlIHJpZ2h0IHR5cGUsIGxvZyBlcnJvciwgbW92ZSB1cCBvbmUsIGFuZCBnbyB0byBuZXh0IGxvb3AgaXRlcmF0aW9uXG4gICAgICAgIGlmICh0aW1lVG9rZW4udHlwZSAhPT0gJ3RpbWUnICYmIGRheVRva2VuLnR5cGUgIT09ICdkYXlzJykge1xuICAgICAgICAgICAgdXRpbHMubG9nKCdUb2tlbnMgJyArIGkgKyAnIGFuZCAnICsgKGkgKyAxKSArICcgbm90IHRpbWUgLSBkYXlzIHBhaXInLCBzdGF0ZSk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldCB0aGUgdGltZSBwcm9maWxlIGZvciBhIGdpdmVuIHNldCBvZiByYW5nZXMgKGkuZS4gbWFwIG9mIDMwIG1pbiBrZXkgdG8gYm9vbGVhbiwgaS5lLiAxNDMwOiB0cnVlKVxuICAgICAgICB0aW1lUHJvZmlsZSA9IGdldFRpbWVQcm9maWxlKHRpbWVUb2tlbi52YWx1ZS5yYW5nZXMpO1xuXG4gICAgICAgIC8vIG5vdyBsb29wIHRocm91Z2ggZGF5cyBhbmQgYXBwbHkgcHJvZmlsZSB0byBlYWNoIGRheVxuICAgICAgICBmb3IgKGogPSAwOyBqIDwgZGF5VG9rZW4udmFsdWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGRheSA9IGRheVRva2VuLnZhbHVlW2pdO1xuICAgICAgICAgICAgZGF5VGltZXNbZGF5XSA9IGRheVRpbWVzW2RheV0gfHwge307XG5cbiAgICAgICAgICAgIGlmICh0aW1lVG9rZW4udmFsdWUuYWxsRGF5KSB7XG4gICAgICAgICAgICAgICAgZGF5VGltZXNbZGF5XS5hbGxEYXkgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaXNBbGxEYXlFdmVyeURheSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGZvciAodGltZSBpbiB0aW1lUHJvZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGltZVByb2ZpbGUuaGFzT3duUHJvcGVydHkodGltZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheVRpbWVzW2RheV1bdGltZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gbW92ZSB1cCAyXG4gICAgICAgIGkgKz0gMjtcbiAgICB9XG5cbiAgICB2YXIgaXNBbGxXZWVrID0gT2JqZWN0LmtleXMoZGF5VGltZXMpLmxlbmd0aCA9PT0gNztcbiAgICBpZiAoaXNBbGxXZWVrICYmIGlzQWxsRGF5RXZlcnlEYXkpIHtcbiAgICAgICAgcmV0dXJuIHsgZXZlcnlEYXlBbGxUaW1lOiB0cnVlIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkYXlUaW1lcy5pc0FsbFdlZWtTYW1lVGltZSA9IGlzQWxsV2VlayAmJiBpc1NhbWVUaW1lO1xuICAgICAgICBkYXlUaW1lcy50aW1lem9uZSA9IHN0YXRlLnRpbWV6b25lIHx8ICdlc3QnO1xuICAgICAgICByZXR1cm4gZGF5VGltZXM7XG4gICAgfVxufVxuXG4vKipcbiAqIENvbnZlcnQgaG91cnMgdGV4dCB0byBhbiBvYmplY3QgYnkgZmlyc3QgZ2V0dGluZyBhbGwgdG9rZW5zIGluIHN0cmluZyBhbmQgdGhlblxuICogd29ya2luZyBvbiB0b2tlbnMgdG8gdGhlIHBvaW50IHdoZXJlIHRoZXJlIGFyZSBkYXlzIC0gdGltZSBwYWlycy5cbiAqXG4gKiBAcGFyYW0gaG91cnNUZXh0XG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybiB7fSBUaGlzIG9iamVjdCBjb250YWlucyBhbiBhcnJheSBvZiBkYXlzIGFuZCBhbiBhcnJheSBvZiB0aW1lcyAodyBzdGFydFRpbWUgYW5kIGVuZFRpbWUpXG4gKi9cbmZ1bmN0aW9uIHBhcnNlKGhvdXJzVGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBzdGF0ZSA9IHt9O1xuXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5ub0xvZykgeyAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub0xvZyBvcHRpb24gbW9zdGx5IHVzZWQgZm9yIHRlc3RpbmdcbiAgICAgICAgc3RhdGUubm9Mb2cgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubG9nSGFuZGxlcikgeyAgICAgICAgICAgICAgICAgICAgLy8gbm9Mb2cgb3B0aW9uIG1vc3RseSB1c2VkIGZvciB0ZXN0aW5nXG4gICAgICAgIHN0YXRlLmxvZ0hhbmRsZXIgPSBvcHRpb25zLmxvZ0hhbmRsZXI7XG4gICAgfVxuXG4gICAgc3RhdGUudG9rZW5zID0gbGV4ZXIuZ2V0VG9rZW5zKGhvdXJzVGV4dCwgb3B0aW9ucyk7ICAgICAvLyB1c2UgbGV4ZXIgdG8gZ2V0IGluaXRpYWwgdG9rZW5zIGZyb20gdGhlIHN0cmluZ1xuXG4gICAgc3RhdGUgPSBwYXJzZVRpbWV6b25lKHN0YXRlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIHRpbWV6b25lIChvbmx5IG9uZSBhbGxvd2VkKVxuICAgIHN0YXRlID0gcGFyc2VBbVBtKHN0YXRlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXBwbHkgQU0vUE0gdG8gYWxsIGhvdXJzXG4gICAgc3RhdGUgPSB0aW1lQWxsV2VlayhzdGF0ZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB1c2UgY2FzZSB3aGVyZSB0aW1lIGJ5IGl0c2VsZiB3aXRob3V0IGRheXMgc2luY2UgYWxsIHdlZWtcbiAgICBzdGF0ZSA9IGRvT3BlcmF0aW9ucyhzdGF0ZSwgJ3Rocm91Z2gnLCB0aHJvdWdoT3ApOyAgICAgIC8vIGRvIHJhbmdlcyBvZiB0aW1lcyBhbmQgZGF5c1xuICAgIHN0YXRlID0gY29tcHJlc3NEYXlUaW1lcyhzdGF0ZSk7ICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29tcHJlc3MgdGltZXMgYW5kIGRheXMgdG9nZXRoZXJcblxuICAgIHJldHVybiBnZXREYXlUaW1lcyhzdGF0ZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IG9iamVjdCB3aXRoIGNvbWJpbmVkIGRheXMgYW5kIHRpbWVzXG59XG5cbi8vIGV4cG9zZSBmdW5jdGlvbnMgZm9yIHRoaXMgbW9kdWxlXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0aHJvdWdoT3A6IHRocm91Z2hPcCxcbiAgICBwYXJzZVRpbWV6b25lOiBwYXJzZVRpbWV6b25lLFxuICAgIHBhcnNlQW1QbTogcGFyc2VBbVBtLFxuICAgIHRpbWVBbGxXZWVrOiB0aW1lQWxsV2VlayxcbiAgICBkb09wZXJhdGlvbnM6IGRvT3BlcmF0aW9ucyxcbiAgICBjb21wcmVzc0RheVRpbWVzOiBjb21wcmVzc0RheVRpbWVzLFxuICAgIGdldFRpbWVQcm9maWxlOiBnZXRUaW1lUHJvZmlsZSxcbiAgICBnZXREYXlUaW1lczogZ2V0RGF5VGltZXMsXG4gICAgcGFyc2U6IHBhcnNlXG59OyIsIi8qKlxuICogQXV0aG9yOiBKZWZmIFdoZWxwbGV5XG4gKiBEYXRlOiA0LzMvMTVcbiAqXG4gKiBDb21tb24gc3RhdGljIGhlbHBlciBmdW5jdGlvbnMgYW5kIGRhdGEgdGhhdCBhcmUgdXNlZCBieSB0aGVcbiAqIGxleGVyIGFuZCBwYXJzZXJcbiAqL1xuXG52YXIgd2hpdGVzcGFjZSA9IFsnICcsICdcXHInLCAnXFx0JywgJ1xcbicsICdcXHYnLCAnXFx1MDBBMCddO1xudmFyIGlnbm9yZSA9IFsnLicsICcoJywgJyknLCAnLCcsICdhbmQnLCAnOicsICdhbGwnLCAndGltZXMnLCAnJicsICcjJywgJzsnLCAnfCddO1xudmFyIGRheXNPZldlZWsgPSBbJ21vbmRheScsICd0dWVzZGF5JywgJ3dlZG5lc2RheScsICd0aHVyc2RheScsICdmcmlkYXknLCAnc2F0dXJkYXknLCAnc3VuZGF5J107XG52YXIgYWxpYXNlcyA9IHtcbiAgICBvcGVyYXRpb25zOiB7XG4gICAgICAgICd0aHJvdWdoJzogIFsnLScsICd+JywgJ3RvJywgJ3RocnUnXVxuICAgIH0sXG4gICAgdGltZXpvbmVzOiB7XG4gICAgICAgIGVzdDogWydldCcsICdlYXN0ZXJuJ10sXG4gICAgICAgIGNzdDogWydjdCcsICdjZW50cmFsJ10sXG4gICAgICAgIG1zdDogWydtdCcsICdtb3VudGFpbiddLFxuICAgICAgICBwc3Q6IFsncHQnLCAncGFjaWZpYyddXG4gICAgfSxcbiAgICBkYXlzOiB7XG4gICAgICAgIG1vbmRheTogICAgIFsnbScsICdtbycsICdtb24nLCAnbW9tJ10sXG4gICAgICAgIHR1ZXNkYXk6ICAgIFsndCcsICd0dScsICd0dWUnLCAndHVlcyddLFxuICAgICAgICB3ZWRuZXNkYXk6ICBbJ3cnLCAnd2UnLCAnd2VkJ10sXG4gICAgICAgIHRodXJzZGF5OiAgIFsndCcsICd0aCcsICd0aHUnLCAndGh1cicsICd0aHVycyddLFxuICAgICAgICBmcmlkYXk6ICAgICBbJ2YnLCAnZnInLCAnZnJpJ10sXG4gICAgICAgIHNhdHVyZGF5OiAgIFsncycsICdzYScsICdzYXQnXSxcbiAgICAgICAgc3VuZGF5OiAgICAgWydzJywgJ3N1JywgJ3N1biddXG4gICAgfVxufTtcblxuLyoqXG4gKiBDaGVjayBpZiBjaGFyYWN0ZXIgaXMgYSBsZXR0ZXJcbiAqIEBwYXJhbSBjaFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTGV0dGVyKGNoKSB7XG4gICAgcmV0dXJuICgoJ2EnIDw9IGNoICYmIGNoIDw9ICd6JykgfHxcbiAgICAgICAgKCdBJyA8PSBjaCAmJiBjaCA8PSAnWicpKSAmJiB0eXBlb2YgY2ggPT09IFwic3RyaW5nXCI7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgY2hhcmFjdGVyIGlzIGEgbnVtYmVyXG4gKiBAcGFyYW0gY2hcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlcihjaCkge1xuICAgIHJldHVybiAnMCcgPD0gY2ggJiYgY2ggPD0gJzknICYmIHR5cGVvZiBjaCA9PT0gXCJzdHJpbmdcIjtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBjaGFyYWN0ZXIgaXMgb25lIHRoYXQgd2Ugc2tpcCBvdmVyXG4gKiBAcGFyYW0gY2hcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1NraXAoY2gpIHtcbiAgICByZXR1cm4gd2hpdGVzcGFjZS5pbmRleE9mKGNoKSA+IC0xIHx8IGlnbm9yZS5pbmRleE9mKGNoKSA+IC0xO1xufVxuXG4vKipcbiAqIElmIHRoZSBjdXJyZW50IGNoYXIgaXMgYW4gaWdub3JlIGNoYXJcbiAqIEBwYXJhbSBjaFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzSWdub3JlKGNoKSB7XG4gICAgcmV0dXJuIGlnbm9yZS5pbmRleE9mKGNoKSA+IC0xO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHN0cmluZyBpcyBlaXRoZXIgYW0gb3IgcG1cbiAqIEBwYXJhbSBzdHJcbiAqIEBwYXJhbSBwcmV2Q2hhclxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQW1QbShzdHIsIHByZXZDaGFyKSB7XG4gICAgcmV0dXJuIHN0ciA9PT0gJ2FtJyB8fCBzdHIgPT09ICdwbScgfHxcbiAgICAgICAgKHByZXZDaGFyICYmICFpc05hTihwcmV2Q2hhcikgJiYgKHN0ciA9PT0gJ2EnIHx8IHN0ciA9PT0gJ3AnKSk7XG59XG5cbi8qKlxuICogR2l2ZW4gYSBwYXJ0aWN1bGFyIGFsaWFzIHR5cGUsIHNlZSBpZiBnaXZlbiBzdHJpbmcgaXMgaW4gdGhlcmVcbiAqIEBwYXJhbSBhbGlhc1R5cGVcbiAqIEBwYXJhbSBzdHJcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBsb29rdXBBbGlhcyhhbGlhc1R5cGUsIHN0cikge1xuICAgIHZhciBsb29rdXAgPSBhbGlhc2VzW2FsaWFzVHlwZV0gfHwge307XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhsb29rdXApO1xuICAgIHZhciBpLCBqLCBrZXksIHZhbHM7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgIGlmIChrZXkgPT09IHN0cikge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbHMgPSBsb29rdXBba2V5XTtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IHZhbHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmICh2YWxzW2pdID09PSBzdHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQnkgZGVmYXVsdCB0aGlzIHdpbGwgc2ltcGx5IGxvZyBtZXNzYWdlcyB0byB0aGUgY29uc29sZSwgYnV0IGRlcGVuZGluZyBvbiBpbnB1dCBvcHRpb25zLFxuICogdGhpcyBjYW4gYWxzbyB0aHJvdyBlcnJvcnMgb3IgcG90ZW50aWFsbHkgZG8gbW9yZSBpbiB0aGUgZnV0dXJlIHdoZW4gaXNzdWVzIG9jY3VyXG4gKiBAcGFyYW0gc3RyXG4gKiBAcGFyYW0gc3RhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKHN0ciwgc3RhdGUpIHtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuXG4gICAgaWYgKHN0YXRlLmxvZ0hhbmRsZXIpIHtcbiAgICAgICAgc3RhdGUubG9nSGFuZGxlcihzdHIgKyAnIHx8IHN0YXRlID0gJyArIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKCFzdGF0ZS5ub0xvZykge1xuICAgICAgICBjb25zb2xlLmxvZyhzdHIgKyAnIHx8IHN0YXRlID0gJyArIEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XG4gICAgfVxufVxuXG4vLyBleHBvc2luZyBwcm9wZXJ0aWVzIGFuZCBmdW5jdGlvbnMgZm9yIHRoaXMgbW9kdWxlXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkYXlzT2ZXZWVrOiBkYXlzT2ZXZWVrLFxuICAgIGFsaWFzZXM6IGFsaWFzZXMsXG4gICAgaXNMZXR0ZXI6IGlzTGV0dGVyLFxuICAgIGlzTnVtYmVyOiBpc051bWJlcixcbiAgICBpc1NraXA6IGlzU2tpcCxcbiAgICBpc0lnbm9yZTogaXNJZ25vcmUsXG4gICAgaXNBbVBtOiBpc0FtUG0sXG4gICAgbG9va3VwQWxpYXM6IGxvb2t1cEFsaWFzLFxuICAgIGxvZzogbG9nXG59OyJdfQ==
