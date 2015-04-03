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

    // get one word (i.e. until not a letter)
    while (index < len) {
        ch = state.text.charAt(index);

        if (!utils.isIgnoreChar(ch)) {
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

    if (utils.isAmPm(str)) {
        state.tokens.push({ type: 'ampm', value: str });
    }
    else if (timezone) {
        state.tokens.push({ type: 'timezone', value: timezone });
    }
    else if (op) {
        state.tokens.push({ type: 'operation', value: op });
    }
    else if (day) {
        state.tokens.push({ type: 'day', value: day });
    }
    else {
        utils.log('Unknown string ' + str, state);
    }

    return state;
}

/**
 * Read digits and : to get a time
 * @param state
 */
function readTime(state) {
    var time = '0';
    var ch, hrs, mins;

    while (state.index < state.text.length) {
        ch = state.text.charAt(state.index);

        if (ch === ':') {
            hrs = parseInt(time);
            time = '0';
        }
        else if (!utils.isNumber(ch)) {
            break;
        }
        else {
            time += ch;
        }

        state.index++;
    }

    if (hrs) {
        mins = parseInt(time);
    }
    else {
        hrs = parseInt(time);
        mins = 0;
    }

    state.tokens = state.tokens || [];
    state.tokens.push({
        type: 'time',
        hrs: hrs,
        mins: mins
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

    // do common replacements
    state.text = state.text.replace(/eastern standard time/g, 'est');
    state.text = state.text.replace(/eastern time/g, 'est');
    state.text = state.text.replace(/pacific standard time/g, 'pst');
    state.text = state.text.replace(/pacific time/g, 'pst');

    if (state.text.indexOf('24 hours') > -1) {
        state.tokens.push({
            type: 'timerange',
            start: 0,
            end: 2400
        });

        state.text = state.text.replace('24 hours', '');
    }

    if (state.text.indexOf('7 days') > -1) {
        state.tokens.push({
            type: 'days',
            value: utils.daysOfWeek
        });

        state.text = state.text.replace('7 days', '');
    }

    return state;
}

/**
 * Convert an hours string into a set of tokens
 * @param hoursText
 */
function getTokens(hoursText) {

    // no tokens returned if no text
    if (!hoursText) { return []; }

    // state is what we use as we lex
    var state = {
        text: hoursText.toLowerCase(),
        index: 0,
        tokens: []
    };
    var ch, op;

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
        else if (utils.isSkipChar(ch)) {
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
    return state.tokens;
}

// expose functions
module.exports = {
    readString: readString,
    readTime: readTime,
    checkCommonHours: checkCommonHours,
    getTokens: getTokens
};