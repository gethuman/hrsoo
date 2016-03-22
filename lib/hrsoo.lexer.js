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
            hrs = parseInt(time, 10);
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
        mins = parseInt(time, 10);
    }
    else {
        hrs = parseInt(time, 10);
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
    text = text.replace(/24\s?[-/]\s?7/g, '24 hours, 7 days');
    text = text.replace(/noon/g, '12pm');
    text = text.replace(/â€“/g, 'through');
    text = text.replace(/ã¢â‚¬â€œ/g, 'through');
    text = text.replace(/\//g, ' ');
    text = text.replace('7 days a week', '7 days');
    text = text.replace('seven days a week', '7 days');

    if (text === '24 hours') {
        state.tokens.push({
            type: 'time',
            value: {
                allDay: true
            }
        });
        state.tokens.push({
            type: 'days',
            value: utils.daysOfWeek
        });
        text = text.replace('24 hours', '');
    }
    else {
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