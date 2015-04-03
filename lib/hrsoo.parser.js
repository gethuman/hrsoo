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
    var i, token, timezone;

    for (i = (state.tokens.length - 1); i >= 0; i--) {
        token = state.tokens[i];

        if (token.type === 'timezone') {
            if (timezone && token.value !== timezone) {
                utils.log('Multiple timezones found. Using ' + timezone + ' and ignoring ' + token.value);
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
    var i, token, prevToken;

    for (i = (state.tokens.length - 1); i > 0; i--) {  // not a mistake > 0 because ampm shouldn't be first token
        token = state.tokens[i];
        prevToken = state.tokens[i - 1];

        if (token.type === 'ampm') {

            if (prevToken.type === 'time') {
                prevToken.ampm = token.value;
            }
            else {
                utils.log('Previous token is ' + prevToken.type + ' ' +
                            prevToken.value +  ' so ignore timzone ' + token.value);
            }

            // we have used the value so remove it
            state.tokens.splice(i, 1);
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
        utils.log('Through operation without prev or next');
        state.tokens.splice(index, 1);
        return state;
    }

    // get the previous and next tokens for processing
    var prev = state.tokens[index - 1];
    var next = state.tokens[index + 1];
    var i, startDayIdx, endDayIdx, startTime, endTime;

    // if types don't match or not day or time, then just remove this token and ignore
    if (prev.type !== next.type || (prev.type !== 'day' && prev.type !== 'time')) {
        utils.log('Through operation previous ' + prev.type + ' next ' + next.type);
        state.tokens.splice(index, 1);
        return state;
    }
    else if (prev.type === 'day') {
        startDayIdx = utils.daysOfWeek.indexOf(prev.value);
        endDayIdx = utils.daysOfWeek.indexOf(next.value);

        prev.days = [];
        for (i = startDayIdx; (i <= endDayIdx && i < utils.daysOfWeek.length); i++) {
            prev.days.push(utils.daysOfWeek[i]);
        }

        // this can happen with sat - sun
        if (endDayIdx < startDayIdx) {
            for (i = 0; i <= endDayIdx; i++) {
                prev.days.push(utils.daysOfWeek[i]);
            }
        }

        // replace prev token with days
        prev.type = 'days';
        delete prev.value;

        state.tokens.splice(index, 2);
    }
    else if (prev.type === 'time') {
        startTime = (prev.hrs || 0) * 100 + (prev.mins || 0);
        endTime = (next.hrs || 0) * 100 + (prev.mins || 0);

        if ((next.ampm && next.ampm === 'pm') || (!next.ampm && endTime < 800)) {
            endTime += 1200;
        }

        if ((prev.ampm && prev.ampm === 'pm') || (!prev.ampm && startTime < 500)) {
            startTime += 1200;
        }

        if (startTime >= endTime) {
            utils.log('Start time ' + startTime + ' must be before end time ' + endTime);
        }

        // replace prev token with time range
        prev.type = 'timerange';
        prev.start = startTime;
        prev.end = endTime;
        delete prev.value;

        // remove the through token and the second time token which aren't needed anymore
        state.tokens.splice(index, 2);
    }

    // return the latest state
    return state;
}

/**
 * What to do here?
 *
 * @param state
 * @param index
 */
function andOp(state, index) {

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

    for (i = 0; i < state.tokens.length; i++) {
        token = state.tokens[i];

        if (token.type === 'operation' && token.value === opName) {
            state = opFn(state, i);
        }
    }

    return state;
}

function combineTimeDay(state) {

    // try to match up day ranges or days with times (assume same format day - time or time - day

    // NOTE: can have multiple time ranges on any given day...change database schema

}

function tokensToObject(tokens) {

    // now should have days with hours, so just reformatting of object

}

/**
 * Convert hours text to an object
 * @param hoursText
 */
function parse(hoursText) {
    var state = {
        tokens: lexer.getTokens(hoursText) || []
    };

    state = parseTimezone(state);
    state = parseAmPm(state);
    state = doOperations(state, 'through', throughOp);
    state = combineTimeDay(state);
    state = doOperations(state, 'and', andOp);

    // now we have everything we need (or we should), so generate the hours object
    return tokensToObject(state.tokens);
}


module.exports = {
    throughOp: throughOp,
    andOp: andOp,
    parseTimezone: parseTimezone,
    parseAmPm: parseAmPm,
    execOperations: execOperations,
    combineTimeDay: combineTimeDay,
    tokensToObject: tokensToObject,
    parse: parse
};