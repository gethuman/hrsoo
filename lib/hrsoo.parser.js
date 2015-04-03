/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 *
 */


function through(state, index) {
    if (index < 1 || index > (state.tokens.length - 2)) {
        throw new Error('Through operation without prev or next');
    }

    var prev = state.tokens[index - 1];
    var next = state.tokens[index + 1];
    var i, startDayIdx, endDayIdx, days, startTime, endTime;

    if (prev.type !== next.type) {
        throw new Error('Through operation previous ' + prev.type + ' next ' + next.type);
    }

    if (prev.type === 'day') {
        startDayIdx = daysOfWeek.indexOf(prev.value);
        endDayIdx = daysOfWeek.indexOf(next.value);

        if (startDayIdx < 0) {
            throw new Error('Day ' + prev.value + ' does not exist');
        }
        else if (endDayIdx < 0) {
            throw new Error('Day ' + prev.value + ' does not exist');
        }
        else if (startDayIdx >= endDayIdx) {
            throw new Error(prev.value + ' must be before ' + next.value);
        }
        else {
            days = [];
            for (i = startDayIdx; i <= endDayIdx; i++) {
                days.push(daysOfWeek[i]);
            }

            // replace prev token with days
            state.tokens[index - 1] = {
                type: 'days',
                value: days
            };
        }
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
            throw new Error('Start time ' + startTime + ' must be before end time ' + endTime);
        }

        // replace prev token with time range
        state.tokens[index - 1] = {
            type: 'timerange',
            start: startTime,
            end: endTime
        };
    }
    else {
        throw new Error('Invalid type ' + prev.type + ' for through operation');
    }

    // remove the current and next tokens and return
    state.tokens.splice(index, 2);
    return state;
}



function parseTimezone(state) {
    var i, token, timezone;

    for (i = (state.tokens.length - 1); i >= 0; i--) {
        token = state.tokens[i];

        if (token.type === 'timezone') {
            if (timezone && token.value !== timezone) {
                throw new Error('You cannot use multiple timezones: ' + timezone + ' and ' + token.value);
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
                throw new Error('Invalid token ' + prevToken.type + ' ' +
                prevToken.value +  ' before ' + token.value);
            }

            // we have used the value so remove it
            state.tokens.splice(i, 1);
        }
    }

    return state;
}

function execOperations(state) {
    var i, token;

    for (i = 0; i < state.tokens.length; i++) {
        token = state.tokens[i];

        if (token.type === 'operation') {
            state = token.fn(state, i);
        }
    }

    return state;
}

function combineTimeDay(state) {

    // try to match up day ranges or days with times (assume same format day - time or time - day

    // NOTE: can have multiple time ranges on any given day...change database schema

}

function generateHours(state) {

    // now should have days with hours, so just reformatting of object

}

/**
 * Convert hours text to an object
 * @param hoursText
 */
function parse(hoursText) {
    var state = {
        tokens: lex(hoursText) || []
    };

    state = parseTimezone(state);
    state = parseAmPm(state);
    state = execOperations(state);
    state = combineTimeDay(state);

    // now we have everything we need (or we should), so generate the hours object
    return generateHours(state);
}


module.exports = {

};