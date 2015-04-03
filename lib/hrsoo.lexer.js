/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Goal of this module is to take a string with hours of operation
 * and output a set of tokens that can be used by the parser
 */



function readString(state) {
    var str = state.text.charAt(state.index);
    var ch;
    state.index++;

    while (state.index < state.text.length) {
        ch = state.text.charAt(state.index);

        if (!isLetter(ch)) {
            break;
        }

        str += ch;
        state.index++;
    }

    var timezone = lookupValue(timezones, str);
    var day = lookupValue(days, str);
    var op = lookupValue(operationAliases, str);

    if (isAmPm(str)) {
        state.tokens.push({
            type: 'ampm',
            value: str
        });
    }
    else if (timezone) {
        state.tokens.push({
            type: 'timezone',
            value: timezone
        });
    }
    else if (op) {
        state.tokens.push({
            type:   'operation',
            fn:     op
        });
    }
    else if (day) {
        state.tokens.push({
            type:   'day',
            value:  str
        });
    }
    else {
        throw new Error('Unknown string ' + str);
    }
}

function readTime(state) {
    var time = state.text.charAt(state.index);
    var ch, hrs, mins;
    state.index++;

    while (state.index < state.text.length) {
        ch = state.text.charAt(state.index);

        if (ch !== ':') {
            hrs = parseInt(time);
        }
        else if (!isNumber(ch)) {
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

    state.tokens.push({
        type: 'time',
        hrs: hrs,
        mins: mins
    });
}

function checkCommonHours(state) {
    var str = state.text;

    // do common replacements
    state.text = state.text.replace(/eastern standard time/g, 'est');
    state.text = state.text.replace(/pacific standard time/g, 'pst');


    if (str.indexOf('24 hours') > -1) {
        state.tokens.push({
            type: 'timerange',
            start: 0,
            end: 2400
        });

        str.replace('24 hours', '');
    }

    if (str.indexOf('7 days') > -1) {
        state.tokens.push({
            type: 'days',
            value: daysOfWeek
        });

        str.replace('7 days', '');
    }

    return state;
}

/**
 * Convert an hours string into a set of tokens
 * @param hoursText
 */
function lex(hoursText) {

    // no tokens returned if no text
    if (!hoursText) { return null; }

    // state is what we use as we lex
    var state = {
        text: hoursText.toLowerCase(),
        index: 0,
        tokens: []
    };
    var ch;

    // check the common phrases in the hours
    state = checkCommonHours(state);

    while (state.index < state.text.length) {
        ch = state.text.charAt(state.index);

        if (isLetter(ch)) {
            state = readString(state);
        }
        else if (isNumber(ch)) {
            state = readTime(state);
        }
        else if (isSkipChar(ch)) {
            this.index++;
        }
        else if (operations[ch]) {
            state.tokens.push({
                type: 'operation',
                fn: operations[ch]
            });
            state.index++;
        }
        else {
            throw new Error('Unexpected character: ' + ch);
        }
    }

    // now we should have all the tokens in the state
    return state.tokens;
}


module.exports = {




};