(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Author: Jeff Whelpley
 * Date: 4/2/15
 *
 * Main interface for hrsoo when including it in node or the browser
 */
var parser = require('./hrsoo.parser');
var formatter = require('./hrsoo.formatter');

// we are only exposing a couple functions from this module
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvaHJzb28uanMiLCJsaWIvaHJzb28uZm9ybWF0dGVyLmpzIiwibGliL2hyc29vLmxleGVyLmpzIiwibGliL2hyc29vLnBhcnNlci5qcyIsImxpYi9ocnNvby51dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBBdXRob3I6IEplZmYgV2hlbHBsZXlcbiAqIERhdGU6IDQvMi8xNVxuICpcbiAqIE1haW4gaW50ZXJmYWNlIGZvciBocnNvbyB3aGVuIGluY2x1ZGluZyBpdCBpbiBub2RlIG9yIHRoZSBicm93c2VyXG4gKi9cbnZhciBwYXJzZXIgPSByZXF1aXJlKCcuL2hyc29vLnBhcnNlcicpO1xudmFyIGZvcm1hdHRlciA9IHJlcXVpcmUoJy4vaHJzb28uZm9ybWF0dGVyJyk7XG5cbi8vIHdlIGFyZSBvbmx5IGV4cG9zaW5nIGEgY291cGxlIGZ1bmN0aW9ucyBmcm9tIHRoaXMgbW9kdWxlXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwYXJzZTogICAgICBwYXJzZXIucGFyc2UsXG4gICAgc3RyaW5naWZ5OiAgZm9ybWF0dGVyLnN0cmluZ2lmeSxcbiAgICBmb3JtYXQ6ICAgICBmb3JtYXR0ZXIuZm9ybWF0XG59O1xuIiwiLyoqXG4gKiBBdXRob3I6IEplZmYgV2hlbHBsZXlcbiAqIERhdGU6IDQvMy8xNVxuICpcbiAqIEZvcm1hdCBhIGhyc29vIG9iamVjdCBpbnRvIGEgcGFydGljdWxhciBvdXRwdXQgZm9ybWF0XG4gKi9cbnZhciBwYXJzZXIgPSByZXF1aXJlKCcuL2hyc29vLnBhcnNlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9ocnNvby51dGlscycpO1xudmFyIHRpbWV6b25lcyA9IHtcbiAgICBlc3Q6IDUwMCxcbiAgICBjc3Q6IDQwMCxcbiAgICBtc3Q6IDMwMCxcbiAgICBwc3Q6IDIwMFxufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgc3RyaW5nIGZyb20gbWlsaXRhcnkgdGltZSArIHRpbWV6b25lIGRpZmZlcmVuY2VcbiAqIEBwYXJhbSB0aW1lXG4gKi9cbmZ1bmN0aW9uIGdldFRpbWVTdHJpbmcodGltZSkge1xuICAgIHRpbWUgPSB0aW1lIHx8IDA7XG5cbiAgICAvLyB6ZXJvIGlzIHRoZSBmbG9vclxuICAgIGlmICh0aW1lIDw9IDApIHsgdGltZSA9IDA7IH1cblxuICAgIC8vIGlmIHRpbWUgaXMgMCwgMTIwMCBvciAyNDAwLCByZXR1cm4gc3BlY2lmaWMgc3RyaW5nXG4gICAgaWYgKHRpbWUgPT09IDAgfHwgdGltZSA9PT0gMjQwMCkge1xuICAgICAgICByZXR1cm4gJ21pZG5pZ2h0JztcbiAgICB9XG4gICAgZWxzZSBpZiAodGltZSA9PT0gMTIwMCkge1xuICAgICAgICByZXR1cm4gJ25vb24nO1xuICAgIH1cblxuICAgIHZhciBocnMgPSBNYXRoLmZsb29yKHRpbWUgLyAxMDApO1xuICAgIHZhciBtaW5zID0gdGltZSAtIChocnMgKiAxMDApO1xuICAgIHZhciBhbXBtID0gKGhycyA+IDExICYmIGhycyA8IDI0KSA/ICdwbScgOiAnYW0nO1xuXG4gICAgaWYgKGhycyA+IDEyKSB7XG4gICAgICAgIGhycyA9IGhycyAtIDEyO1xuICAgIH1cblxuICAgIHZhciBzdHIgPSBocnM7XG4gICAgaWYgKG1pbnMpIHsgc3RyICs9ICc6JyArIG1pbnM7IH1cblxuICAgIHJldHVybiBzdHIgKyBhbXBtO1xufVxuXG4vKipcbiAqIEZvcm1hdCB0aW1lIGJhc2VkIG9uIGEgdGltZSBwcm9maWxlXG4gKiBAcGFyYW0gdGltZVByb2ZpbGVcbiAqIEBwYXJhbSBjdXJyZW50VGltZXpvbmVcbiAqIEBwYXJhbSBkZXNpcmVkVGltZXpvbmVcbiAqL1xuZnVuY3Rpb24gZm9ybWF0VGltZSh0aW1lUHJvZmlsZSwgY3VycmVudFRpbWV6b25lLCBkZXNpcmVkVGltZXpvbmUpIHtcbiAgICBjdXJyZW50VGltZXpvbmUgPSBjdXJyZW50VGltZXpvbmUgfHwgJ2VzdCc7XG4gICAgZGVzaXJlZFRpbWV6b25lID0gZGVzaXJlZFRpbWV6b25lIHx8ICdlc3QnO1xuXG4gICAgaWYgKCF0aW1lUHJvZmlsZSkge1xuICAgICAgICByZXR1cm4gJ2Nsb3NlZCc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRpbWVQcm9maWxlLmFsbERheSkge1xuICAgICAgICByZXR1cm4gJ2FsbCBkYXknO1xuICAgIH1cblxuICAgIHZhciB0aW1lem9uZURpZmYgPSB0aW1lem9uZXNbZGVzaXJlZFRpbWV6b25lXSAtIHRpbWV6b25lc1tjdXJyZW50VGltZXpvbmVdO1xuICAgIHZhciB0aW1lID0gMDtcbiAgICB2YXIgdGltZVN0ciA9ICcnO1xuICAgIHZhciBhbGxUaW1lc1N0ciA9ICcnO1xuICAgIHZhciBncm91cFN0YXJ0VGltZSA9IG51bGw7XG5cbiAgICB3aGlsZSAodGltZSA8PSAyNDAwKSB7XG5cbiAgICAgICAgLy8gZ2V0IHRpbWUgc3RyaW5nIGZyb20gdGltZSArIGFtL3BtIGFuZCB0aW1lem9uZSBkaWZmXG4gICAgICAgIHRpbWVTdHIgPSBnZXRUaW1lU3RyaW5nKHRpbWUgKyB0aW1lem9uZURpZmYpO1xuXG4gICAgICAgIC8vIGlmIHRpbWUgc2VsZWN0ZWQgYW5kIG5vIGdyb3VwIHRpbWUgeWV0LCBzZXQgaXRcbiAgICAgICAgaWYgKHRpbWVQcm9maWxlW3RpbWUgKyAnJ10gJiYgIWdyb3VwU3RhcnRUaW1lKSB7XG4gICAgICAgICAgICBncm91cFN0YXJ0VGltZSA9IHRpbWVTdHI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZWxzZSBpZiBlaXRoZXIgd2UgYXJlIGF0IG1pZG5pZ2h0IG9yIG5vIG1vciB0aW1lIHNlbGVjdGVkIGFuZCB0aGVyZSBpcyBhIGdyb3VwIHRpbWUsIGFkZCBpdCB0byB0aGUgc3RyaW5nXG4gICAgICAgIGVsc2UgaWYgKCghdGltZVByb2ZpbGVbdGltZSArICcnXSB8fCB0aW1lID09PSAyNDAwKSAmJiBncm91cFN0YXJ0VGltZSkge1xuICAgICAgICAgICAgaWYgKGFsbFRpbWVzU3RyKSB7IGFsbFRpbWVzU3RyICs9ICcsICc7IH1cbiAgICAgICAgICAgIGFsbFRpbWVzU3RyICs9IGdyb3VwU3RhcnRUaW1lICsgJy0nICsgdGltZVN0cjtcbiAgICAgICAgICAgIGdyb3VwU3RhcnRUaW1lID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgodGltZSAlIDEwMCkgPT09IDApIHtcbiAgICAgICAgICAgIHRpbWUgKz0gMzA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aW1lICs9IDcwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsbFRpbWVzU3RyID8gYWxsVGltZXNTdHIgOiAnY2xvc2VkJztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGhvdXJzIG9iamVjdCB0byBhIGZvcm1hdHRlZCBzdHJpbmdcbiAqIEBwYXJhbSBob3Vyc09ialxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBzdHJpbmdpZnkoaG91cnNPYmosIG9wdGlvbnMpIHtcbiAgICBob3Vyc09iaiA9IGhvdXJzT2JqIHx8IHt9O1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdmFyIHR5cGUgPSBvcHRpb25zLnR5cGUgfHwgJ21lZGl1bSc7XG5cbiAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIDI0LTdcbiAgICBpZiAoaG91cnNPYmouZXZlcnlEYXlBbGxUaW1lKSB7XG4gICAgICAgIHJldHVybiB0eXBlID09PSAnc2hvcnQnID8gJzI0LTcnIDogJzI0IGhvdXJzLCA3IGRheXMnO1xuICAgIH1cblxuICAgIHZhciBjdXJyZW50VGltZXpvbmUgPSBob3Vyc09iai50aW1lem9uZSB8fCAnZXN0JztcbiAgICB2YXIgZGVzaXJlZFRpbWV6b25lID0gb3B0aW9ucy50aW1lem9uZSB8fCBjdXJyZW50VGltZXpvbmU7XG4gICAgdmFyIGRheXNPZldlZWsgPSB1dGlscy5kYXlzT2ZXZWVrO1xuICAgIHZhciBhbGlhc2VzID0gdXRpbHMuYWxpYXNlcy5kYXlzO1xuICAgIHZhciBvdXRwdXRTdHIgPSAnJztcbiAgICB2YXIgZ3JvdXBUaW1lID0gbnVsbDtcbiAgICB2YXIgZ3JvdXBTdGFydERheSA9IG51bGw7XG4gICAgdmFyIHByZXZEYXlGb3JtYXR0ZWQgPSBudWxsO1xuICAgIHZhciBkYXksIGRheUZvcm1hdHRlZCwgdGltZUZvcm1hdHRlZDtcblxuICAgIC8vIGdvIHRocm91Z2ggdGhlIGRheXMgb2YgdGhlIHdlZWtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICBkYXkgPSBkYXlzT2ZXZWVrW2ldO1xuXG4gICAgICAgIGRheUZvcm1hdHRlZCA9IHR5cGUgPT09ICdzaG9ydCcgPyBhbGlhc2VzW2RheV1bMF0gOlxuICAgICAgICAgICAgdHlwZSA9PT0gJ21lZGl1bScgPyBhbGlhc2VzW2RheV1bMl0gOiBkYXk7XG4gICAgICAgIGRheUZvcm1hdHRlZCA9IGRheUZvcm1hdHRlZC5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIGRheUZvcm1hdHRlZC5zdWJzdHJpbmcoMSk7XG5cbiAgICAgICAgdGltZUZvcm1hdHRlZCA9IGhvdXJzT2JqW2RheV0gP1xuICAgICAgICAgICAgZm9ybWF0VGltZShob3Vyc09ialtkYXldLCBjdXJyZW50VGltZXpvbmUsIGRlc2lyZWRUaW1lem9uZSkgOiAnY2xvc2VkJztcblxuICAgICAgICBpZiAoaG91cnNPYmouaXNBbGxXZWVrU2FtZVRpbWUpIHtcbiAgICAgICAgICAgIG91dHB1dFN0ciA9IHRpbWVGb3JtYXR0ZWQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghZ3JvdXBUaW1lKSB7XG4gICAgICAgICAgICBncm91cFRpbWUgPSB0aW1lRm9ybWF0dGVkO1xuICAgICAgICAgICAgZ3JvdXBTdGFydERheSA9IGRheUZvcm1hdHRlZDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0aW1lRm9ybWF0dGVkICE9PSBncm91cFRpbWUpIHtcblxuICAgICAgICAgICAgaWYgKGdyb3VwVGltZSAhPT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAob3V0cHV0U3RyKSB7IG91dHB1dFN0ciArPSAnLCAnOyB9XG4gICAgICAgICAgICAgICAgb3V0cHV0U3RyICs9IGdyb3VwU3RhcnREYXk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZEYXlGb3JtYXR0ZWQgIT09IGdyb3VwU3RhcnREYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3RyICs9ICctJyArIHByZXZEYXlGb3JtYXR0ZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dFN0ciArPSAnICcgKyBncm91cFRpbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG5vdyByZXNldCB2YWx1ZXMgd2l0aCBjdXJyZW50XG4gICAgICAgICAgICBncm91cFN0YXJ0RGF5ID0gZGF5Rm9ybWF0dGVkO1xuICAgICAgICAgICAgZ3JvdXBUaW1lID0gdGltZUZvcm1hdHRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHByZXZEYXlGb3JtYXR0ZWQgPSBkYXlGb3JtYXR0ZWQ7XG4gICAgfVxuXG4gICAgLy8gbmVlZCB0byBkbyBsYXN0IGRheSB3aGljaCBpcyBub3QgaW4gdGhlIGxvb3BcbiAgICBpZiAoZ3JvdXBUaW1lICYmIGdyb3VwVGltZSAhPT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgaWYgKG91dHB1dFN0cikgeyBvdXRwdXRTdHIgKz0gJywgJzsgfVxuICAgICAgICBvdXRwdXRTdHIgKz0gZ3JvdXBTdGFydERheTtcbiAgICAgICAgaWYgKHByZXZEYXlGb3JtYXR0ZWQgIT09IGdyb3VwU3RhcnREYXkpIHtcbiAgICAgICAgICAgIG91dHB1dFN0ciArPSAnLScgKyBwcmV2RGF5Rm9ybWF0dGVkO1xuICAgICAgICB9XG4gICAgICAgIG91dHB1dFN0ciArPSAnICcgKyBncm91cFRpbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dFN0ciArICcgJyArIGRlc2lyZWRUaW1lem9uZS50b1VwcGVyQ2FzZSgpO1xufVxuXG4vKipcbiAqIFNpbXBsZSBvYmplY3QgdGhhdCB0dXJucyBocnMgb2Ygb3BlcmF0aW9uIHRleHQgdG8gYW4gb2JqZWN0IGFuZFxuICogdGhlbiBzdHJpbmdpZmllcyB0aGUgb2JqZWN0IHdpdGggYSBwYXJ0aWN1bGFyIGZvcm1hdC5cbiAqXG4gKiBAcGFyYW0gaHJzVGV4dFxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBmb3JtYXQoaHJzVGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBocnNPYmogPSBwYXJzZXIucGFyc2UoaHJzVGV4dCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHN0cmluZ2lmeShocnNPYmosIG9wdGlvbnMpO1xufVxuXG4vLyBleHBvc2UgZnVuY3Rpb25zXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRUaW1lU3RyaW5nOiBnZXRUaW1lU3RyaW5nLFxuICAgIGZvcm1hdFRpbWU6IGZvcm1hdFRpbWUsXG4gICAgc3RyaW5naWZ5OiBzdHJpbmdpZnksXG4gICAgZm9ybWF0OiBmb3JtYXRcbn07IiwiLyoqXG4gKiBBdXRob3I6IEplZmYgV2hlbHBsZXlcbiAqIERhdGU6IDQvMy8xNVxuICpcbiAqIEdvYWwgb2YgdGhpcyBtb2R1bGUgaXMgdG8gdGFrZSBhIHN0cmluZyB3aXRoIGhvdXJzIG9mIG9wZXJhdGlvblxuICogYW5kIG91dHB1dCBhIHNldCBvZiB0b2tlbnMgdGhhdCBjYW4gYmUgdXNlZCBieSB0aGUgcGFyc2VyXG4gKi9cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vaHJzb28udXRpbHMnKTtcblxuLyoqXG4gKiBSZWFkIG9uZSBzdHJpbmcgb2YgbGV0dGVyc1xuICogQHBhcmFtIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIHJlYWRTdHJpbmcoc3RhdGUpIHtcblxuICAgIC8vIGRvIG5vdGhpbmcgaWYgbm90IHRoZSByaWdodCBwYXJhbXNcbiAgICBpZiAoIXN0YXRlIHx8ICFzdGF0ZS50ZXh0KSB7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG5cbiAgICB2YXIgbGVuID0gc3RhdGUudGV4dC5sZW5ndGg7XG4gICAgdmFyIGluZGV4ID0gc3RhdGUuaW5kZXggfHwgMDtcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgdmFyIGNoO1xuICAgIHZhciBwcmV2Q2hhciA9IGluZGV4ID4gMCA/IHN0YXRlLnRleHQuY2hhckF0KGluZGV4IC0gMSkgOiBudWxsO1xuXG4gICAgLy8gZ2V0IG9uZSB3b3JkIChpLmUuIHVudGlsIG5vdCBhIGxldHRlcilcbiAgICB3aGlsZSAoaW5kZXggPCBsZW4pIHtcbiAgICAgICAgY2ggPSBzdGF0ZS50ZXh0LmNoYXJBdChpbmRleCk7XG5cbiAgICAgICAgaWYgKCF1dGlscy5pc0lnbm9yZShjaCkpIHtcbiAgICAgICAgICAgIGlmICghdXRpbHMuaXNMZXR0ZXIoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4Kys7XG4gICAgfVxuICAgIHN0YXRlLmluZGV4ID0gaW5kZXg7XG5cbiAgICAvLyBpZiBubyBzdHJpbmcsIHRoZW4ganVzdCByZXR1cm4gaGVyZVxuICAgIGlmICghc3RyKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG5cbiAgICBzdHIgPSBzdHIudG9Mb3dlckNhc2UoKTtcbiAgICBzdGF0ZS50b2tlbnMgPSBzdGF0ZS50b2tlbnMgfHwgW107XG5cbiAgICB2YXIgdGltZXpvbmUgPSB1dGlscy5sb29rdXBBbGlhcygndGltZXpvbmVzJywgc3RyKTtcbiAgICB2YXIgZGF5ID0gdXRpbHMubG9va3VwQWxpYXMoJ2RheXMnLCBzdHIpO1xuICAgIHZhciBvcCA9IHV0aWxzLmxvb2t1cEFsaWFzKCdvcGVyYXRpb25zJywgc3RyKTtcblxuICAgIGlmICh1dGlscy5pc0FtUG0oc3RyLCBwcmV2Q2hhcikpIHtcbiAgICAgICAgaWYgKHN0ciA9PT0gJ2EnKSB7IHN0ciA9ICdhbSc7IH1cbiAgICAgICAgaWYgKHN0ciA9PT0gJ3AnKSB7IHN0ciA9ICdwbSc7IH1cbiAgICAgICAgc3RhdGUudG9rZW5zLnB1c2goeyB0eXBlOiAnYW1wbScsIHZhbHVlOiBzdHIgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRpbWV6b25lKSB7XG4gICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHsgdHlwZTogJ3RpbWV6b25lJywgdmFsdWU6IHRpbWV6b25lIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChvcCkge1xuICAgICAgICBzdGF0ZS50b2tlbnMucHVzaCh7IHR5cGU6ICdvcGVyYXRpb24nLCB2YWx1ZTogb3AgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGRheSkge1xuICAgICAgICBzdGF0ZS50b2tlbnMucHVzaCh7IHR5cGU6ICdkYXlzJywgdmFsdWU6IFtkYXldIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChzdHIgPT09ICdjbG9zZWQnKSB7XG4gICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHsgdHlwZTogJ3RpbWUnLCB2YWx1ZTogeyBpc0Nsb3NlZDogdHJ1ZSB9fSk7XG4gICAgfVxuICAgIC8vZWxzZSBpZiAoIXV0aWxzLmlzSWdub3JlKHN0cikpIHtcbiAgICAvLyAgICB1dGlscy5sb2coJ1Vua25vd24gc3RyaW5nICcgKyBzdHIsIHN0YXRlKTtcbiAgICAvL31cblxuICAgIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBSZWFkIGRpZ2l0cyBhbmQgOiB0byBnZXQgYSB0aW1lXG4gKiBAcGFyYW0gc3RhdGVcbiAqL1xuZnVuY3Rpb24gcmVhZFRpbWUoc3RhdGUpIHtcbiAgICB2YXIgdGltZSA9ICcwJztcbiAgICB2YXIgY2gsIGhycywgbWlucztcbiAgICB2YXIgY29sb25Gb3VuZCA9IGZhbHNlO1xuICAgIHZhciBjaGFyQ291bnQgPSAwO1xuXG4gICAgd2hpbGUgKHN0YXRlLmluZGV4IDwgc3RhdGUudGV4dC5sZW5ndGgpIHtcbiAgICAgICAgY2ggPSBzdGF0ZS50ZXh0LmNoYXJBdChzdGF0ZS5pbmRleCk7XG5cbiAgICAgICAgaWYgKGNoID09PSAnOicgfHwgKCFjb2xvbkZvdW5kICYmIGNoYXJDb3VudCA8IDMgJiYgY2ggPT09ICcuJykpIHtcbiAgICAgICAgICAgIGNvbG9uRm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgaHJzID0gcGFyc2VJbnQodGltZSk7XG4gICAgICAgICAgICB0aW1lID0gJzAnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCF1dGlscy5pc051bWJlcihjaCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGltZSArPSBjaDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNoYXJDb3VudCsrO1xuICAgICAgICBzdGF0ZS5pbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChocnMpIHtcbiAgICAgICAgbWlucyA9IHBhcnNlSW50KHRpbWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaHJzID0gcGFyc2VJbnQodGltZSk7XG4gICAgICAgIG1pbnMgPSAwO1xuICAgIH1cblxuICAgIC8vIGluIHRoaXMgc2l0dWF0aW9uIHRoZSBwZXJzb24gZm9yZ290IHRoZSBjb2xvblxuICAgIGlmIChocnMgPiAxMiAmJiAhY29sb25Gb3VuZCAmJiAoaHJzICsgJycpLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgdmFyIHRvdGFsVGltZSA9IGhycztcbiAgICAgICAgaHJzID0gTWF0aC5mbG9vcih0b3RhbFRpbWUgLyAxMDApO1xuICAgICAgICBtaW5zID0gdG90YWxUaW1lIC0gKGhycyAqIDEwMCk7XG4gICAgfVxuXG4gICAgc3RhdGUudG9rZW5zID0gc3RhdGUudG9rZW5zIHx8IFtdO1xuICAgIHN0YXRlLnRva2Vucy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgaHJzOiBocnMsXG4gICAgICAgICAgICBtaW5zOiBtaW5zXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBIYWNrIGZ1bmN0aW9uIGp1c3QgdG8gY292ZXIgc29tZSBlZGdlIGNhc2VzIHRoYXQgYXJlIGhhcmRlciB0byB0dXJuIGludG8gZ3JhbW1lci5cbiAqIEV2ZW50dWFsbHkgSSBzaG91bGQgbWFrZSB0aGlzIHBhcnQgb2YgdGhlIGdyYW1tZXIsIHRob3VnaC5cbiAqXG4gKiBAcGFyYW0gc3RhdGVcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjaGVja0NvbW1vbkhvdXJzKHN0YXRlKSB7XG4gICAgc3RhdGUudG9rZW5zID0gc3RhdGUudG9rZW5zIHx8IFtdO1xuICAgIHZhciB0ZXh0ID0gc3RhdGUudGV4dDtcblxuICAgIC8vIGRvIGNvbW1vbiByZXBsYWNlbWVudHNcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9lYXN0ZXJuIHN0YW5kYXJkIHRpbWUvZywgJ2VzdCcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL2Vhc3Rlcm4gdGltZS9nLCAnZXN0Jyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvcGFjaWZpYyBzdGFuZGFyZCB0aW1lL2csICdwc3QnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9wYWNpZmljIHRpbWUvZywgJ3BzdCcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL21vdW50YWluIHN0YW5kYXJkIHRpbWUvZywgJ21zdCcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL21vdW50YWluIHRpbWUvZywgJ21zdCcpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL2NlbnRyYWwgc3RhbmRhcmQgdGltZS9nLCAnY3N0Jyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvY2VudHJhbCB0aW1lL2csICdjc3QnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9taWRuaWdodC9nLCAnMTJhbScpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL8Oi4oKs4oCcL2csICd0aHJvdWdoJyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvw6PCosOi4oCawqzDouKCrMWTL2csICd0aHJvdWdoJyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFwvL2csICcgJyk7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgnNyBkYXlzIGEgd2VlaycsICc3IGRheXMnKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKCdzZXZlbiBkYXlzIGEgd2VlaycsICc3IGRheXMnKTtcblxuICAgIGlmICh0ZXh0LmluZGV4T2YoJzI0IGhvdXJzJykgPiAtMSkge1xuICAgICAgICBzdGF0ZS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgIGFsbERheTogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKCcyNCBob3VycycsICcnKTtcbiAgICB9XG5cbiAgICBpZiAodGV4dC5pbmRleE9mKCc3IGRheXMnKSA+IC0xKSB7XG4gICAgICAgIHN0YXRlLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6ICdkYXlzJyxcbiAgICAgICAgICAgIHZhbHVlOiB1dGlscy5kYXlzT2ZXZWVrXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoJzcgZGF5cycsICcnKTtcbiAgICB9XG5cbiAgICBzdGF0ZS50ZXh0ID0gdGV4dDtcbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQ29udmVydCBhbiBob3VycyBzdHJpbmcgaW50byBhIHNldCBvZiB0b2tlbnNcbiAqIEBwYXJhbSBob3Vyc1RleHRcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIGdldFRva2Vucyhob3Vyc1RleHQsIG9wdGlvbnMpIHtcblxuICAgIC8vIG5vIHRva2VucyByZXR1cm5lZCBpZiBubyB0ZXh0XG4gICAgaWYgKCFob3Vyc1RleHQpIHsgcmV0dXJuIFtdOyB9XG5cbiAgICAvLyBzdGF0ZSBpcyB3aGF0IHdlIHVzZSBhcyB3ZSBsZXhcbiAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgIHRleHQ6IGhvdXJzVGV4dC50b0xvd2VyQ2FzZSgpLFxuICAgICAgICBpbmRleDogMCxcbiAgICAgICAgdG9rZW5zOiBbXVxuICAgIH07XG4gICAgdmFyIGNoLCBvcDtcblxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubm9Mb2cpIHtcbiAgICAgICAgc3RhdGUubm9Mb2cgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGNoZWNrIHRoZSBjb21tb24gcGhyYXNlcyBpbiB0aGUgaG91cnNcbiAgICBzdGF0ZSA9IGNoZWNrQ29tbW9uSG91cnMoc3RhdGUpO1xuXG4gICAgd2hpbGUgKHN0YXRlLmluZGV4IDwgc3RhdGUudGV4dC5sZW5ndGgpIHtcbiAgICAgICAgY2ggPSBzdGF0ZS50ZXh0LmNoYXJBdChzdGF0ZS5pbmRleCk7XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzTGV0dGVyKGNoKSkge1xuICAgICAgICAgICAgc3RhdGUgPSByZWFkU3RyaW5nKHN0YXRlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh1dGlscy5pc051bWJlcihjaCkpIHtcbiAgICAgICAgICAgIHN0YXRlID0gcmVhZFRpbWUoc3RhdGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHV0aWxzLmlzU2tpcChjaCkpIHtcbiAgICAgICAgICAgIHN0YXRlLmluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvcCA9IHV0aWxzLmxvb2t1cEFsaWFzKCdvcGVyYXRpb25zJywgY2gpO1xuXG4gICAgICAgICAgICBpZiAob3ApIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvcGVyYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogb3BcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0aWxzLmxvZygnVW5leHBlY3RlZCBjaGFyYWN0ZXI6ICcgKyBjaCwgc3RhdGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGF0ZS5pbmRleCsrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gbm93IHdlIHNob3VsZCBoYXZlIGFsbCB0aGUgdG9rZW5zIGluIHRoZSBzdGF0ZVxuICAgIHJldHVybiBzdGF0ZS50b2tlbnMgfHwgW107XG59XG5cbi8vIGV4cG9zZSBmdW5jdGlvbnNcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHJlYWRTdHJpbmc6IHJlYWRTdHJpbmcsXG4gICAgcmVhZFRpbWU6IHJlYWRUaW1lLFxuICAgIGNoZWNrQ29tbW9uSG91cnM6IGNoZWNrQ29tbW9uSG91cnMsXG4gICAgZ2V0VG9rZW5zOiBnZXRUb2tlbnNcbn07IiwiLyoqXG4gKiBBdXRob3I6IEplZmYgV2hlbHBsZXlcbiAqIERhdGU6IDQvMy8xNVxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIHVzZWQgdG8gdHJhbnNsYXRlIGEgc2V0IG9mIHRva2VucyBpbnRvXG4gKiBhbiBzdGFuZGFyZCBKU09OIG9iamVjdCB3aXRoIGhvdXJzIGRhdGFcbiAqL1xudmFyIGxleGVyID0gcmVxdWlyZSgnLi9ocnNvby5sZXhlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi9ocnNvby51dGlscycpO1xuXG4vKipcbiAqIEdvIHRocm91Z2ggYW5kIHByb2Nlc3MgdGhlIHRpbWV6b25lIHRva2VuKHMpXG4gKiBAcGFyYW0gc3RhdGVcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBwYXJzZVRpbWV6b25lKHN0YXRlKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICBzdGF0ZS50b2tlbnMgPSBzdGF0ZS50b2tlbnMgfHwgW107XG5cbiAgICB2YXIgaSwgdG9rZW4sIHRpbWV6b25lO1xuXG4gICAgZm9yIChpID0gKHN0YXRlLnRva2Vucy5sZW5ndGggLSAxKTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgdG9rZW4gPSBzdGF0ZS50b2tlbnNbaV07XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09ICd0aW1lem9uZScpIHtcbiAgICAgICAgICAgIGlmICh0aW1lem9uZSAmJiB0b2tlbi52YWx1ZSAhPT0gdGltZXpvbmUpIHtcbiAgICAgICAgICAgICAgICB1dGlscy5sb2coJ011bHRpcGxlIHRpbWV6b25lcyBmb3VuZC4gVXNpbmcgJyArIHRpbWV6b25lICsgJyBhbmQgaWdub3JpbmcgJyArIHRva2VuLnZhbHVlLCBzdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aW1lem9uZSA9IHRva2VuLnZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyByZW1vdmUgdGhlIHRpbWV6b25lIHRva2VuIG5vdyB0aGF0IHdlIGhhdmUgcHJvY2Vzc2VkIGl0XG4gICAgICAgICAgICBzdGF0ZS50b2tlbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGUudGltZXpvbmUgPSB0aW1lem9uZSB8fCAnZXN0JzsgIC8vIGVzdCBpcyBkZWZhdWx0XG4gICAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEdvIHRocm91Z2ggYW5kIHByb2Nlc3MgdGhlIGFtcG0gdG9rZW5zLiBUaGlzIGlzIGRvbmUgYnkgc2ltcGx5IGFwcGx5aW5nXG4gKiB0aGUgYW0gb3IgcG0gdG8gdGhlIHRva2VuIGRpcmVjdGx5IHByZWNlZWRpbmcuXG4gKlxuICogQHBhcmFtIHN0YXRlXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gcGFyc2VBbVBtKHN0YXRlKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICBzdGF0ZS50b2tlbnMgPSBzdGF0ZS50b2tlbnMgfHwgW107XG5cbiAgICB2YXIgaSwgdG9rZW4sIHByZXZUb2tlbjtcblxuICAgIGZvciAoaSA9IChzdGF0ZS50b2tlbnMubGVuZ3RoIC0gMSk7IGkgPiAwOyBpLS0pIHsgIC8vIG5vdCBhIG1pc3Rha2UgPiAwIGJlY2F1c2UgYW1wbSBzaG91bGRuJ3QgYmUgZmlyc3QgdG9rZW5cbiAgICAgICAgdG9rZW4gPSBzdGF0ZS50b2tlbnNbaV07XG4gICAgICAgIHByZXZUb2tlbiA9IHN0YXRlLnRva2Vuc1tpIC0gMV07XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09ICdhbXBtJykge1xuXG4gICAgICAgICAgICAvLyBtaXN0YWtlIGlmIHByZXZpb3VzIHRva2VuIGlzIG9wZXJhdGlvblxuICAgICAgICAgICAgaWYgKHByZXZUb2tlbi50eXBlID09PSAnb3BlcmF0aW9uJykge1xuICAgICAgICAgICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaSAtIDEsIDEpO1xuICAgICAgICAgICAgICAgIGktLTtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJldlRva2VuID0gc3RhdGUudG9rZW5zW2kgLSAxXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByZXZUb2tlbi50eXBlID09PSAndGltZScpIHtcbiAgICAgICAgICAgICAgICBwcmV2VG9rZW4uYW1wbSA9IHRva2VuLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbHMubG9nKCdQcmV2aW91cyB0b2tlbiBpcyAnICsgcHJldlRva2VuLnR5cGUgKyAnICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZUb2tlbi52YWx1ZSArICAnIHNvIGlnbm9yZSB0aW1lem9uZSAnICsgdG9rZW4udmFsdWUsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gd2UgaGF2ZSB1c2VkIHRoZSB2YWx1ZSBzbyByZW1vdmUgaXRcbiAgICAgICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogSWYganVzdCB0d28gdGltZSB0b2tlbnMgd2l0aCB0aHJvdWdoLCB0aGVuIGFzc3VtZSBhbGwgd2Vla1xuICogQHBhcmFtIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIHRpbWVBbGxXZWVrKHN0YXRlKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICB2YXIgdG9rZW5zID0gc3RhdGUudG9rZW5zO1xuXG4gICAgLy8gaWYganVzdCBvbmUgdG9rZW4gd2l0aCB0aW1lIGFkZCBhIHRocm91Z2ggdG9rZW5cbiAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gMiAmJiB0b2tlbnNbMF0udHlwZSA9PT0gJ3RpbWUnICYmIHRva2Vuc1sxXS50eXBlID09PSAndGltZScpIHtcbiAgICAgICAgdG9rZW5zLnNwbGljZSgxLCAwLCB7XG4gICAgICAgICAgICB0eXBlOiAgICdvcGVyYXRpb24nLFxuICAgICAgICAgICAgdmFsdWU6ICAndGhyb3VnaCdcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbm93IGlmIHRocmVlIHRva2VucyB0aGF0IGdvIHRpbWUsIHRocm91Z2gsIHRpbWUsIHRoZW4gd2UgYXNzdW1lIGFsbCB3ZWVrXG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IDMgJiZcbiAgICAgICAgdG9rZW5zWzBdLnR5cGUgPT09ICd0aW1lJyAmJlxuICAgICAgICB0b2tlbnNbMV0udHlwZSA9PT0gJ29wZXJhdGlvbicgJiYgdG9rZW5zWzFdLnZhbHVlID09PSAndGhyb3VnaCcgJiZcbiAgICAgICAgdG9rZW5zWzJdLnR5cGUgPT09ICd0aW1lJykge1xuXG4gICAgICAgIHRva2Vucy5zcGxpY2UoMCwgMCwge1xuICAgICAgICAgICAgdHlwZTogJ2RheXMnLFxuICAgICAgICAgICAgdmFsdWU6IHV0aWxzLmRheXNPZldlZWtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEV4ZWN1dGUgYWxsIHRva2VucyB0aGF0IHdpdGggdGhlIGdpdmVuIG9wZXJhdGlvblxuICogQHBhcmFtIHN0YXRlXG4gKiBAcGFyYW0gb3BOYW1lXG4gKiBAcGFyYW0gb3BGblxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGRvT3BlcmF0aW9ucyhzdGF0ZSwgb3BOYW1lLCBvcEZuKSB7XG4gICAgdmFyIGksIHRva2VuO1xuXG4gICAgZm9yIChpID0gKHN0YXRlLnRva2Vucy5sZW5ndGggLSAxKTsgaSA+PSAwIDsgaS0tKSB7XG4gICAgICAgIHRva2VuID0gc3RhdGUudG9rZW5zW2ldO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSAnb3BlcmF0aW9uJyAmJiB0b2tlbi52YWx1ZSA9PT0gb3BOYW1lKSB7XG4gICAgICAgICAgICBzdGF0ZSA9IG9wRm4oc3RhdGUsIGkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIFRoaXMgd2lsbCBwcm9jZXNzIGFueSBcInRocm91Z2hcIiB0b2tlbiB3aGljaCBtZWFucyB0aGF0IHNvbWVvbmVcbiAqIHdhcyBkb2luZyBhIHJhbmdlIGJldHdlZW4gdHdvIHZhbHVlcyAoZWl0aGVyIGRheXMgb3IgdGltZXMpLlxuICpcbiAqIEBwYXJhbSBzdGF0ZVxuICogQHBhcmFtIGluZGV4XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gdGhyb3VnaE9wKHN0YXRlLCBpbmRleCkge1xuXG4gICAgLy8gaWYgdGhyb3VnaCBpcyBmaXJzdCBvciBsYXN0IHRva2VuLCB3ZSBjYW4ndCBkbyBhbnl0aGluZyBzbyByZW1vdmUgaXQgYW5kIGdvIG9uXG4gICAgaWYgKGluZGV4IDwgMSB8fCBpbmRleCA+IChzdGF0ZS50b2tlbnMubGVuZ3RoIC0gMikpIHtcbiAgICAgICAgdXRpbHMubG9nKCdUaHJvdWdoIG9wZXJhdGlvbiB3aXRob3V0IHByZXYgb3IgbmV4dCcsIHN0YXRlKTtcbiAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG5cbiAgICAvLyBnZXQgdGhlIHByZXZpb3VzIGFuZCBuZXh0IHRva2VucyBmb3IgcHJvY2Vzc2luZ1xuICAgIHZhciBwcmV2ID0gc3RhdGUudG9rZW5zW2luZGV4IC0gMV07XG4gICAgdmFyIG5leHQgPSBzdGF0ZS50b2tlbnNbaW5kZXggKyAxXTtcbiAgICB2YXIgaSwgc3RhcnREYXlJZHgsIGVuZERheUlkeCwgc3RhcnRUaW1lLCBlbmRUaW1lO1xuXG4gICAgLy8gaWYgdHlwZXMgZG9uJ3QgbWF0Y2ggb3Igbm90IGRheSBvciB0aW1lLCB0aGVuIGp1c3QgcmVtb3ZlIHRoaXMgdG9rZW4gYW5kIGlnbm9yZVxuICAgIGlmIChwcmV2LnR5cGUgIT09IG5leHQudHlwZSB8fCAocHJldi50eXBlICE9PSAnZGF5cycgJiYgcHJldi50eXBlICE9PSAndGltZScpKSB7XG4gICAgICAgIC8vdXRpbHMubG9nKCdUaHJvdWdoIG9wZXJhdGlvbiBwcmV2aW91cyAnICsgcHJldi50eXBlICsgJyBuZXh0ICcgKyBuZXh0LnR5cGUsIHN0YXRlKTtcbiAgICAgICAgc3RhdGUudG9rZW5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAocHJldi50eXBlID09PSAnZGF5cycpIHtcblxuICAgICAgICBpZiAoIXByZXYudmFsdWUubGVuZ3RoIHx8ICFuZXh0LnZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgdXRpbHMubG9nKCdObyBkYXlzIGluIHByZXYgb3IgbmV4dCcsIHN0YXRlKTtcbiAgICAgICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnREYXlJZHggPSB1dGlscy5kYXlzT2ZXZWVrLmluZGV4T2YocHJldi52YWx1ZVswXSk7XG4gICAgICAgIGVuZERheUlkeCA9IHV0aWxzLmRheXNPZldlZWsuaW5kZXhPZihuZXh0LnZhbHVlWzBdKTtcblxuICAgICAgICBpZiAoc3RhcnREYXlJZHggPCAwIHx8IGVuZERheUlkeCA8IDEpIHtcbiAgICAgICAgICAgIHV0aWxzLmxvZygnU3RhcnQgb3IgZW5kIGRheSBkb2VzIG5vdCBleGlzdCcsIHN0YXRlKTtcbiAgICAgICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJldi52YWx1ZSA9IFtdO1xuICAgICAgICBmb3IgKGkgPSBzdGFydERheUlkeDsgKGkgPD0gZW5kRGF5SWR4ICYmIGkgPCB1dGlscy5kYXlzT2ZXZWVrLmxlbmd0aCk7IGkrKykge1xuICAgICAgICAgICAgcHJldi52YWx1ZS5wdXNoKHV0aWxzLmRheXNPZldlZWtbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhpcyBjYW4gaGFwcGVuIHdpdGggc2F0IC0gc3VuXG4gICAgICAgIGlmIChlbmREYXlJZHggPCBzdGFydERheUlkeCkge1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8PSBlbmREYXlJZHg7IGkrKykge1xuICAgICAgICAgICAgICAgIHByZXYudmFsdWUucHVzaCh1dGlscy5kYXlzT2ZXZWVrW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSB0aHJvdWdoIGFuZCBuZXh0IGluZGV4XG4gICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaW5kZXgsIDIpO1xuICAgIH1cbiAgICBlbHNlIGlmIChwcmV2LnR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICBwcmV2LnZhbHVlID0gcHJldi52YWx1ZSB8fCB7fTtcbiAgICAgICAgbmV4dC52YWx1ZSA9IG5leHQudmFsdWUgfHwge307XG5cbiAgICAgICAgc3RhcnRUaW1lID0gKHByZXYudmFsdWUuaHJzIHx8IDApICogMTAwICsgKHByZXYudmFsdWUubWlucyB8fCAwKTtcbiAgICAgICAgZW5kVGltZSA9IChuZXh0LnZhbHVlLmhycyB8fCAwKSAqIDEwMCArIChuZXh0LnZhbHVlLm1pbnMgfHwgMCk7XG5cbiAgICAgICAgaWYgKChuZXh0LmFtcG0gJiYgbmV4dC5hbXBtID09PSAncG0nKSB8fCAoIW5leHQuYW1wbSAmJiBlbmRUaW1lIDwgODAwKSB8fFxuICAgICAgICAgICAgKGVuZFRpbWUgPT09IDEyMDAgJiYgbmV4dC5hbXBtID09PSAnYW0nKSkge1xuXG4gICAgICAgICAgICBlbmRUaW1lICs9IDEyMDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKHByZXYuYW1wbSAmJiBwcmV2LmFtcG0gPT09ICdwbScgJiYgc3RhcnRUaW1lIDwgMTIwMCkgfHwgKCFwcmV2LmFtcG0gJiYgc3RhcnRUaW1lIDwgNTAwKSkge1xuICAgICAgICAgICAgc3RhcnRUaW1lICs9IDEyMDA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aW1lcyB0aGUgc2FtZSBhbmQgYm90aCBiZWZvcmUgMTIgYW5kIHNlY29uZCBubyBwbSwgdGhlbiBtb3ZlIHRvIHBtXG4gICAgICAgIGlmIChzdGFydFRpbWUgPT09IGVuZFRpbWUgJiYgc3RhcnRUaW1lIDw9IDEyMDAgJiYgZW5kVGltZSA8PSAxMjAwICYmICghbmV4dC5hbXBtIHx8IG5leHQuYW1wbSAhPT0gJ3BtJykpIHtcbiAgICAgICAgICAgIGVuZFRpbWUgKz0gMTIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVuZFRpbWUgY2FuIGJlIGJlZm9yZSBzdGFydFRpbWUgaW4gc2l0dWF0aW9ucyB3aGVyZSBlbmQgdGltZSBpcyBsYXRlIGF0IG5pZ2h0IChleC4gOGFtIC0gMmFtKVxuICAgICAgICBpZiAoZW5kVGltZSA+IDMwMCAmJiBzdGFydFRpbWUgPj0gZW5kVGltZSkge1xuICAgICAgICAgICAgdXRpbHMubG9nKCdTdGFydCB0aW1lICcgKyBzdGFydFRpbWUgKyAnIG11c3QgYmUgYmVmb3JlIGVuZCB0aW1lICcgKyBlbmRUaW1lLCBzdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyByZXBsYWNlIHByZXYgdG9rZW4gdmFsdWUgd2l0aCB0aW1lIHJhbmdlXG4gICAgICAgIHByZXYudmFsdWUgPSB7XG4gICAgICAgICAgICByYW5nZXM6IFt7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0VGltZSxcbiAgICAgICAgICAgICAgICBlbmQ6IGVuZFRpbWVcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG4gICAgICAgIGRlbGV0ZSBwcmV2LmFtcG07XG5cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSB0aHJvdWdoIHRva2VuIGFuZCB0aGUgc2Vjb25kIHRpbWUgdG9rZW4gd2hpY2ggYXJlbid0IG5lZWRlZCBhbnltb3JlXG4gICAgICAgIHN0YXRlLnRva2Vucy5zcGxpY2UoaW5kZXgsIDIpO1xuICAgIH1cblxuICAgIC8vIHJldHVybiB0aGUgbGF0ZXN0IHN0YXRlXG4gICAgcmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIENvbWJpbmUgZGF5cyB3aXRoIGFkamFjZW50IGRheXMgYW5kIHRpbWVzIHdpdGggYWRqYWNlbnQgdGltZXNcbiAqIEBwYXJhbSBzdGF0ZVxuICovXG5mdW5jdGlvbiBjb21wcmVzc0RheVRpbWVzKHN0YXRlKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICB2YXIgdG9rZW5zID0gc3RhdGUudG9rZW5zIHx8IFtdO1xuXG4gICAgLy8gbm90IGF0IGxlYXN0IHR3byB0b2tlbnMsIHJldHVybiByaWdodCBhd2F5XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCAyKSB7IHJldHVybiBzdGF0ZTsgfVxuXG4gICAgdmFyIHByZXZUb2tlbiwgY3VycmVudFRva2VuLCBpO1xuXG4gICAgZm9yIChpID0gKHRva2Vucy5sZW5ndGggLSAxKTsgaSA+IDA7IGktLSkge1xuICAgICAgICBwcmV2VG9rZW4gPSB0b2tlbnNbaSAtIDFdO1xuICAgICAgICBjdXJyZW50VG9rZW4gPSB0b2tlbnNbaV07XG5cbiAgICAgICAgLy8gaWYgaG91cnMgbGlzdGVkIGF0IHRoaXMgcG9pbnQsIGxvZyBpdCBiZWNhdXNlIHRoZXkgc2hvdWxkIGJlIHJhbmdlc1xuICAgICAgICBpZiAoaSA9PT0gMSAmJiBwcmV2VG9rZW4udmFsdWUuaG91cnMpIHtcbiAgICAgICAgICAgIHV0aWxzLmxvZygnVG9rZW4gJyArIChpIC0gMSkgKyAnIGhhcyBob3VycyBpbiBjb21wcmVzc0RheVRpbWVzJywgc3RhdGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJyZW50VG9rZW4udmFsdWUuaG91cnMpIHtcbiAgICAgICAgICAgIHV0aWxzLmxvZygnVG9rZW4gJyArIGkgKyAnIGhhcyBob3VycyBpbiBjb21wcmVzc0RheVRpbWVzJywgc3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZXZUb2tlbi50eXBlID09PSAndGltZScgJiYgIXByZXZUb2tlbi52YWx1ZS5pc0Nsb3NlZCAmJlxuICAgICAgICAgICAgY3VycmVudFRva2VuLnR5cGUgPT09ICd0aW1lJyAmJiAhY3VycmVudFRva2VuLnZhbHVlLmlzQ2xvc2VkKSB7XG5cbiAgICAgICAgICAgIC8vIGNvbmNhdCB0aGUgcmFuZ2VzXG4gICAgICAgICAgICBwcmV2VG9rZW4udmFsdWUucmFuZ2VzID0gcHJldlRva2VuLnZhbHVlLnJhbmdlcyB8fCBbXTtcbiAgICAgICAgICAgIHByZXZUb2tlbi52YWx1ZS5yYW5nZXMgPSBwcmV2VG9rZW4udmFsdWUucmFuZ2VzLmNvbmNhdChjdXJyZW50VG9rZW4udmFsdWUucmFuZ2VzIHx8IFtdKTtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRUb2tlbi52YWx1ZS5hbGxEYXkpIHtcbiAgICAgICAgICAgICAgICBwcmV2VG9rZW4udmFsdWUuYWxsRGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdG9rZW5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV2VG9rZW4udHlwZSA9PT0gJ2RheXMnICYmIGN1cnJlbnRUb2tlbi50eXBlID09PSAnZGF5cycpIHtcbiAgICAgICAgICAgIHByZXZUb2tlbi52YWx1ZSA9IHByZXZUb2tlbi52YWx1ZS5jb25jYXQoY3VycmVudFRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgIHRva2Vucy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQ2hhbmdlIHJhbmdlcyB0byBib29sZWFucyBhdCAzMCBtaW4gaW5jcmVtZW50c1xuICogQHBhcmFtIHRpbWVSYW5nZXNcbiAqIEByZXR1cm5zIHt7fX1cbiAqL1xuZnVuY3Rpb24gZ2V0VGltZVByb2ZpbGUodGltZVJhbmdlcykge1xuICAgIHRpbWVSYW5nZXMgPSB0aW1lUmFuZ2VzIHx8IFtdO1xuXG4gICAgdmFyIHRpbWVQcm9maWxlID0ge307XG4gICAgdmFyIGksIHRpbWVSYW5nZSwgdGltZSwgdGltZVN0cjtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0aW1lUmFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRpbWVSYW5nZSA9IHRpbWVSYW5nZXNbaV07XG4gICAgICAgIHRpbWUgPSB0aW1lUmFuZ2Uuc3RhcnQ7XG5cbiAgICAgICAgd2hpbGUgKHRpbWUgPCB0aW1lUmFuZ2UuZW5kKSB7XG4gICAgICAgICAgICB0aW1lU3RyID0gdGltZSArICcnO1xuICAgICAgICAgICAgdGltZVByb2ZpbGVbdGltZVN0cl0gPSB0cnVlO1xuXG4gICAgICAgICAgICBpZiAodGltZVN0ci5zdWJzdHJpbmcodGltZVN0ci5sZW5ndGggLSAyKSA9PT0gJzAwJykge1xuICAgICAgICAgICAgICAgIHRpbWUgKz0gMzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aW1lICs9IDcwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpbWVQcm9maWxlO1xufVxuXG5cbi8qKlxuICogQ29tYmluZSBhbGwgdGhlIGRheXMgYW5kIHRpbWVzOyBvdXRwdXQgc2hvdWxkIGJlIGFycmF5IG9mIHRva2VucyBlYWNoIG9mXG4gKiB3aGljaCBjb250YWlucyBhcnJheSBvZiBkYXlzIGFuZCBhcnJheSBvZiB0aW1lcmFuZ2VzLiBJZiB0aGUgdG9rZW5zIGFyZVxuICogbm90IGxpc3RlZCBpbiBwZXJmZWN0IHBhaXJzIGF0IHRoaXMgcG9pbnQgKGkuZS4gZGF5cyB0b2tlbiBwYWlyZWQgd2l0aCB0aW1lIHRva2VuKVxuICogdGhlbiB0aGVyZSBpcyBhIHByb2JsZW0uXG4gKlxuICogQHBhcmFtIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGdldERheVRpbWVzKHN0YXRlKSB7XG4gICAgdmFyIGRheVRpbWVzID0ge307XG4gICAgdmFyIHRva2VucyA9IHN0YXRlLnRva2VucyB8fCBbXTtcbiAgICB2YXIgdXBwZXJCb3VuZHJ5ID0gdG9rZW5zLmxlbmd0aCAtIDE7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciB0aW1lVG9rZW4sIGRheVRva2VuLCB0aW1lUHJvZmlsZSwgaiwgZGF5LCB0aW1lO1xuICAgIHZhciBpc0FsbERheUV2ZXJ5RGF5ID0gdHJ1ZTtcbiAgICB2YXIgaXNTYW1lVGltZSA9IHRydWU7XG4gICAgdmFyIHNhbWVUaW1lID0gbnVsbDtcblxuICAgIHdoaWxlIChpIDwgdXBwZXJCb3VuZHJ5KSB7XG4gICAgICAgIHRpbWVUb2tlbiA9IHN0YXRlLnRva2Vuc1tpXTtcbiAgICAgICAgZGF5VG9rZW4gPSBzdGF0ZS50b2tlbnNbaSArIDFdO1xuXG4gICAgICAgIC8vIGlmIHRva2VucyBub3QgdGhlIHJpZ2h0IHR5cGUsIHRyeSB0byBmbGlwIHRoZW1cbiAgICAgICAgaWYgKHRpbWVUb2tlbi50eXBlICE9PSAndGltZScgJiYgZGF5VG9rZW4udHlwZSAhPT0gJ2RheXMnKSB7XG4gICAgICAgICAgICB0aW1lVG9rZW4gPSBzdGF0ZS50b2tlbnNbaSArIDFdO1xuICAgICAgICAgICAgZGF5VG9rZW4gPSBzdGF0ZS50b2tlbnNbaV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGltZVRva2VuU3RyID0gSlNPTi5zdHJpbmdpZnkodGltZVRva2VuKTtcbiAgICAgICAgaWYgKCFzYW1lVGltZSkge1xuICAgICAgICAgICAgc2FtZVRpbWUgPSB0aW1lVG9rZW5TdHI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2FtZVRpbWUgIT09IHRpbWVUb2tlblN0cikge1xuICAgICAgICAgICAgaXNTYW1lVGltZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgc3RpbGwgbm90IHRoZSByaWdodCB0eXBlLCBsb2cgZXJyb3IsIG1vdmUgdXAgb25lLCBhbmQgZ28gdG8gbmV4dCBsb29wIGl0ZXJhdGlvblxuICAgICAgICBpZiAodGltZVRva2VuLnR5cGUgIT09ICd0aW1lJyAmJiBkYXlUb2tlbi50eXBlICE9PSAnZGF5cycpIHtcbiAgICAgICAgICAgIHV0aWxzLmxvZygnVG9rZW5zICcgKyBpICsgJyBhbmQgJyArIChpICsgMSkgKyAnIG5vdCB0aW1lIC0gZGF5cyBwYWlyJywgc3RhdGUpO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBnZXQgdGhlIHRpbWUgcHJvZmlsZSBmb3IgYSBnaXZlbiBzZXQgb2YgcmFuZ2VzIChpLmUuIG1hcCBvZiAzMCBtaW4ga2V5IHRvIGJvb2xlYW4sIGkuZS4gMTQzMDogdHJ1ZSlcbiAgICAgICAgdGltZVByb2ZpbGUgPSBnZXRUaW1lUHJvZmlsZSh0aW1lVG9rZW4udmFsdWUucmFuZ2VzKTtcblxuICAgICAgICAvLyBub3cgbG9vcCB0aHJvdWdoIGRheXMgYW5kIGFwcGx5IHByb2ZpbGUgdG8gZWFjaCBkYXlcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGRheVRva2VuLnZhbHVlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBkYXkgPSBkYXlUb2tlbi52YWx1ZVtqXTtcbiAgICAgICAgICAgIGRheVRpbWVzW2RheV0gPSBkYXlUaW1lc1tkYXldIHx8IHt9O1xuXG4gICAgICAgICAgICBpZiAodGltZVRva2VuLnZhbHVlLmFsbERheSkge1xuICAgICAgICAgICAgICAgIGRheVRpbWVzW2RheV0uYWxsRGF5ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlzQWxsRGF5RXZlcnlEYXkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBmb3IgKHRpbWUgaW4gdGltZVByb2ZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRpbWVQcm9maWxlLmhhc093blByb3BlcnR5KHRpbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlUaW1lc1tkYXldW3RpbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1vdmUgdXAgMlxuICAgICAgICBpICs9IDI7XG4gICAgfVxuXG4gICAgdmFyIGlzQWxsV2VlayA9IE9iamVjdC5rZXlzKGRheVRpbWVzKS5sZW5ndGggPT09IDc7XG4gICAgaWYgKGlzQWxsV2VlayAmJiBpc0FsbERheUV2ZXJ5RGF5KSB7XG4gICAgICAgIHJldHVybiB7IGV2ZXJ5RGF5QWxsVGltZTogdHJ1ZSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGF5VGltZXMuaXNBbGxXZWVrU2FtZVRpbWUgPSBpc0FsbFdlZWsgJiYgaXNTYW1lVGltZTtcbiAgICAgICAgZGF5VGltZXMudGltZXpvbmUgPSBzdGF0ZS50aW1lem9uZSB8fCAnZXN0JztcbiAgICAgICAgcmV0dXJuIGRheVRpbWVzO1xuICAgIH1cbn1cblxuLyoqXG4gKiBDb252ZXJ0IGhvdXJzIHRleHQgdG8gYW4gb2JqZWN0IGJ5IGZpcnN0IGdldHRpbmcgYWxsIHRva2VucyBpbiBzdHJpbmcgYW5kIHRoZW5cbiAqIHdvcmtpbmcgb24gdG9rZW5zIHRvIHRoZSBwb2ludCB3aGVyZSB0aGVyZSBhcmUgZGF5cyAtIHRpbWUgcGFpcnMuXG4gKlxuICogQHBhcmFtIGhvdXJzVGV4dFxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEByZXR1cm4ge30gVGhpcyBvYmplY3QgY29udGFpbnMgYW4gYXJyYXkgb2YgZGF5cyBhbmQgYW4gYXJyYXkgb2YgdGltZXMgKHcgc3RhcnRUaW1lIGFuZCBlbmRUaW1lKVxuICovXG5mdW5jdGlvbiBwYXJzZShob3Vyc1RleHQsIG9wdGlvbnMpIHtcbiAgICB2YXIgc3RhdGUgPSB7fTtcblxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubm9Mb2cpIHsgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm9Mb2cgb3B0aW9uIG1vc3RseSB1c2VkIGZvciB0ZXN0aW5nXG4gICAgICAgIHN0YXRlLm5vTG9nID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmxvZ0hhbmRsZXIpIHsgICAgICAgICAgICAgICAgICAgIC8vIG5vTG9nIG9wdGlvbiBtb3N0bHkgdXNlZCBmb3IgdGVzdGluZ1xuICAgICAgICBzdGF0ZS5sb2dIYW5kbGVyID0gb3B0aW9ucy5sb2dIYW5kbGVyO1xuICAgIH1cblxuICAgIHN0YXRlLnRva2VucyA9IGxleGVyLmdldFRva2Vucyhob3Vyc1RleHQsIG9wdGlvbnMpOyAgICAgLy8gdXNlIGxleGVyIHRvIGdldCBpbml0aWFsIHRva2VucyBmcm9tIHRoZSBzdHJpbmdcblxuICAgIHN0YXRlID0gcGFyc2VUaW1lem9uZShzdGF0ZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSB0aW1lem9uZSAob25seSBvbmUgYWxsb3dlZClcbiAgICBzdGF0ZSA9IHBhcnNlQW1QbShzdGF0ZSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFwcGx5IEFNL1BNIHRvIGFsbCBob3Vyc1xuICAgIHN0YXRlID0gdGltZUFsbFdlZWsoc3RhdGUpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXNlIGNhc2Ugd2hlcmUgdGltZSBieSBpdHNlbGYgd2l0aG91dCBkYXlzIHNpbmNlIGFsbCB3ZWVrXG4gICAgc3RhdGUgPSBkb09wZXJhdGlvbnMoc3RhdGUsICd0aHJvdWdoJywgdGhyb3VnaE9wKTsgICAgICAvLyBkbyByYW5nZXMgb2YgdGltZXMgYW5kIGRheXNcbiAgICBzdGF0ZSA9IGNvbXByZXNzRGF5VGltZXMoc3RhdGUpOyAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbXByZXNzIHRpbWVzIGFuZCBkYXlzIHRvZ2V0aGVyXG5cbiAgICByZXR1cm4gZ2V0RGF5VGltZXMoc3RhdGUpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBvYmplY3Qgd2l0aCBjb21iaW5lZCBkYXlzIGFuZCB0aW1lc1xufVxuXG4vLyBleHBvc2UgZnVuY3Rpb25zIGZvciB0aGlzIG1vZHVsZVxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGhyb3VnaE9wOiB0aHJvdWdoT3AsXG4gICAgcGFyc2VUaW1lem9uZTogcGFyc2VUaW1lem9uZSxcbiAgICBwYXJzZUFtUG06IHBhcnNlQW1QbSxcbiAgICB0aW1lQWxsV2VlazogdGltZUFsbFdlZWssXG4gICAgZG9PcGVyYXRpb25zOiBkb09wZXJhdGlvbnMsXG4gICAgY29tcHJlc3NEYXlUaW1lczogY29tcHJlc3NEYXlUaW1lcyxcbiAgICBnZXRUaW1lUHJvZmlsZTogZ2V0VGltZVByb2ZpbGUsXG4gICAgZ2V0RGF5VGltZXM6IGdldERheVRpbWVzLFxuICAgIHBhcnNlOiBwYXJzZVxufTsiLCIvKipcbiAqIEF1dGhvcjogSmVmZiBXaGVscGxleVxuICogRGF0ZTogNC8zLzE1XG4gKlxuICogQ29tbW9uIHN0YXRpYyBoZWxwZXIgZnVuY3Rpb25zIGFuZCBkYXRhIHRoYXQgYXJlIHVzZWQgYnkgdGhlXG4gKiBsZXhlciBhbmQgcGFyc2VyXG4gKi9cblxudmFyIHdoaXRlc3BhY2UgPSBbJyAnLCAnXFxyJywgJ1xcdCcsICdcXG4nLCAnXFx2JywgJ1xcdTAwQTAnXTtcbnZhciBpZ25vcmUgPSBbJy4nLCAnKCcsICcpJywgJywnLCAnYW5kJywgJzonLCAnYWxsJywgJ3RpbWVzJywgJyYnLCAnIycsICc7JywgJ3wnXTtcbnZhciBkYXlzT2ZXZWVrID0gWydtb25kYXknLCAndHVlc2RheScsICd3ZWRuZXNkYXknLCAndGh1cnNkYXknLCAnZnJpZGF5JywgJ3NhdHVyZGF5JywgJ3N1bmRheSddO1xudmFyIGFsaWFzZXMgPSB7XG4gICAgb3BlcmF0aW9uczoge1xuICAgICAgICAndGhyb3VnaCc6ICBbJy0nLCAnficsICd0bycsICd0aHJ1J11cbiAgICB9LFxuICAgIHRpbWV6b25lczoge1xuICAgICAgICBlc3Q6IFsnZXQnLCAnZWFzdGVybiddLFxuICAgICAgICBjc3Q6IFsnY3QnLCAnY2VudHJhbCddLFxuICAgICAgICBtc3Q6IFsnbXQnLCAnbW91bnRhaW4nXSxcbiAgICAgICAgcHN0OiBbJ3B0JywgJ3BhY2lmaWMnXVxuICAgIH0sXG4gICAgZGF5czoge1xuICAgICAgICBtb25kYXk6ICAgICBbJ20nLCAnbW8nLCAnbW9uJywgJ21vbSddLFxuICAgICAgICB0dWVzZGF5OiAgICBbJ3QnLCAndHUnLCAndHVlJywgJ3R1ZXMnXSxcbiAgICAgICAgd2VkbmVzZGF5OiAgWyd3JywgJ3dlJywgJ3dlZCddLFxuICAgICAgICB0aHVyc2RheTogICBbJ3QnLCAndGgnLCAndGh1JywgJ3RodXInLCAndGh1cnMnXSxcbiAgICAgICAgZnJpZGF5OiAgICAgWydmJywgJ2ZyJywgJ2ZyaSddLFxuICAgICAgICBzYXR1cmRheTogICBbJ3MnLCAnc2EnLCAnc2F0J10sXG4gICAgICAgIHN1bmRheTogICAgIFsncycsICdzdScsICdzdW4nXVxuICAgIH1cbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgY2hhcmFjdGVyIGlzIGEgbGV0dGVyXG4gKiBAcGFyYW0gY2hcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0xldHRlcihjaCkge1xuICAgIHJldHVybiAoKCdhJyA8PSBjaCAmJiBjaCA8PSAneicpIHx8XG4gICAgICAgICgnQScgPD0gY2ggJiYgY2ggPD0gJ1onKSkgJiYgdHlwZW9mIGNoID09PSBcInN0cmluZ1wiO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGNoYXJhY3RlciBpcyBhIG51bWJlclxuICogQHBhcmFtIGNoXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIoY2gpIHtcbiAgICByZXR1cm4gJzAnIDw9IGNoICYmIGNoIDw9ICc5JyAmJiB0eXBlb2YgY2ggPT09IFwic3RyaW5nXCI7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgY2hhcmFjdGVyIGlzIG9uZSB0aGF0IHdlIHNraXAgb3ZlclxuICogQHBhcmFtIGNoXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNTa2lwKGNoKSB7XG4gICAgcmV0dXJuIHdoaXRlc3BhY2UuaW5kZXhPZihjaCkgPiAtMSB8fCBpZ25vcmUuaW5kZXhPZihjaCkgPiAtMTtcbn1cblxuLyoqXG4gKiBJZiB0aGUgY3VycmVudCBjaGFyIGlzIGFuIGlnbm9yZSBjaGFyXG4gKiBAcGFyYW0gY2hcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0lnbm9yZShjaCkge1xuICAgIHJldHVybiBpZ25vcmUuaW5kZXhPZihjaCkgPiAtMTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBzdHJpbmcgaXMgZWl0aGVyIGFtIG9yIHBtXG4gKiBAcGFyYW0gc3RyXG4gKiBAcGFyYW0gcHJldkNoYXJcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FtUG0oc3RyLCBwcmV2Q2hhcikge1xuICAgIHJldHVybiBzdHIgPT09ICdhbScgfHwgc3RyID09PSAncG0nIHx8XG4gICAgICAgIChwcmV2Q2hhciAmJiAhaXNOYU4ocHJldkNoYXIpICYmIChzdHIgPT09ICdhJyB8fCBzdHIgPT09ICdwJykpO1xufVxuXG4vKipcbiAqIEdpdmVuIGEgcGFydGljdWxhciBhbGlhcyB0eXBlLCBzZWUgaWYgZ2l2ZW4gc3RyaW5nIGlzIGluIHRoZXJlXG4gKiBAcGFyYW0gYWxpYXNUeXBlXG4gKiBAcGFyYW0gc3RyXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gbG9va3VwQWxpYXMoYWxpYXNUeXBlLCBzdHIpIHtcbiAgICB2YXIgbG9va3VwID0gYWxpYXNlc1thbGlhc1R5cGVdIHx8IHt9O1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMobG9va3VwKTtcbiAgICB2YXIgaSwgaiwga2V5LCB2YWxzO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAga2V5ID0ga2V5c1tpXTtcblxuICAgICAgICBpZiAoa2V5ID09PSBzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cblxuICAgICAgICB2YWxzID0gbG9va3VwW2tleV07XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB2YWxzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAodmFsc1tqXSA9PT0gc3RyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEJ5IGRlZmF1bHQgdGhpcyB3aWxsIHNpbXBseSBsb2cgbWVzc2FnZXMgdG8gdGhlIGNvbnNvbGUsIGJ1dCBkZXBlbmRpbmcgb24gaW5wdXQgb3B0aW9ucyxcbiAqIHRoaXMgY2FuIGFsc28gdGhyb3cgZXJyb3JzIG9yIHBvdGVudGlhbGx5IGRvIG1vcmUgaW4gdGhlIGZ1dHVyZSB3aGVuIGlzc3VlcyBvY2N1clxuICogQHBhcmFtIHN0clxuICogQHBhcmFtIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGxvZyhzdHIsIHN0YXRlKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcblxuICAgIGlmIChzdGF0ZS5sb2dIYW5kbGVyKSB7XG4gICAgICAgIHN0YXRlLmxvZ0hhbmRsZXIoc3RyICsgJyB8fCBzdGF0ZSA9ICcgKyBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgIH1cbiAgICBlbHNlIGlmICghc3RhdGUubm9Mb2cpIHtcbiAgICAgICAgY29uc29sZS5sb2coc3RyICsgJyB8fCBzdGF0ZSA9ICcgKyBKU09OLnN0cmluZ2lmeShzdGF0ZSkpO1xuICAgIH1cbn1cblxuLy8gZXhwb3NpbmcgcHJvcGVydGllcyBhbmQgZnVuY3Rpb25zIGZvciB0aGlzIG1vZHVsZVxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZGF5c09mV2VlazogZGF5c09mV2VlayxcbiAgICBhbGlhc2VzOiBhbGlhc2VzLFxuICAgIGlzTGV0dGVyOiBpc0xldHRlcixcbiAgICBpc051bWJlcjogaXNOdW1iZXIsXG4gICAgaXNTa2lwOiBpc1NraXAsXG4gICAgaXNJZ25vcmU6IGlzSWdub3JlLFxuICAgIGlzQW1QbTogaXNBbVBtLFxuICAgIGxvb2t1cEFsaWFzOiBsb29rdXBBbGlhcyxcbiAgICBsb2c6IGxvZ1xufTsiXX0=
