/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Common static helper functions and data that are used by the
 * lexer and parser
 */

var whitespace = [' ', '\r', '\t', '\n', '\v', '\u00A0'];
var ignore = ['.', '(', ')', ','];
var daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var aliases = {
    operations: {
        'through':  ['-', 'to'],
        'and':      ['&']
    },
    timezones: {
        est: ['et'],
        pst: ['pt'],
        mst: ['mt']
    },
    days: {
        sunday:     ['s', 'su', 'sun'],
        monday:     ['m', 'mo', 'mon'],
        tuesday:    ['t', 'tu', 'tue', 'tues'],
        wednesday:  ['w', 'we', 'wed'],
        thursday:   ['t', 'th', 'thu', 'thur', 'thurs'],
        friday:     ['f', 'fr', 'fri'],
        saturday:   ['s', 'sa', 'sat']
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
function isSkipChar(ch) {
    return whitespace.indexOf(ch) > -1 || ignore.indexOf(ch) > -1;
}

/**
 * If the current char is an ignore char
 * @param ch
 * @returns {boolean}
 */
function isIgnoreChar(ch) {
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
 */
function log(str) {

    //TODO: include options (as part of input to interface) for how errors handled
    console.log(str);
}

// exposing properties and functions for this module
module.exports = {
    daysOfWeek: daysOfWeek,
    aliases: aliases,
    isLetter: isLetter,
    isNumber: isNumber,
    isSkipChar: isSkipChar,
    isIgnoreChar: isIgnoreChar,
    isAmPm: isAmPm,
    lookupAlias: lookupAlias,
    log: log
};