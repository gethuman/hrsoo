/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Common static helper functions and data that are used by the
 * lexer and parser
 */

var whitespace = [' ', '\r', '\t', '\n', '\v', '\u00A0'];
var ignore = ['.', '(', ')', ',', 'and'];
var daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
var aliases = {
    operations: {
        'through':  ['-', 'to', 'thru']
    },
    timezones: {
        est: ['et'],
        cst: ['ct'],
        mst: ['mt'],
        pst: ['pt']
    },
    days: {
        monday:     ['m', 'mo', 'mon'],
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
 * @returns {boolean}
 */
function isAmPm(str) {
    return str === 'am' || str === 'pm';
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

    if (!state.noLog) {
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