/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Common static helper functions and data that are used by the
 * lexer and parser
 */


var operations = {
    '-': 'through'
};

var operationAliases = {
    '-': ['through', 'to']
};

var timezones = {
    est: ['et'],
    pst: ['pt']
};

var daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

var days = {
    sunday:     ['s', 'su', 'sun'],
    monday:     ['m', 'mo', 'mon'],
    tuesday:    ['t', 'tu', 'tue', 'tues'],
    wednesday:  ['w', 'we', 'wed'],
    thursday:   ['t', 'th', 'thu', 'thur', 'thurs'],
    friday:     ['f', 'fr', 'fri'],
    saturday:   ['s', 'sa', 'sat']
};

function isLetter(ch) {
    return ('a' <= ch && ch <= 'z') && typeof ch === "string";
}

function isNumber(ch) {
    return ('0' <= ch && ch <= '9') && typeof ch === "string";
}

function isSkipChar(ch) {
    return (ch === ' ' || ch === '\r' || ch === '\t' ||
    ch === '\n' || ch === '\v' || ch === '\u00A0' ||
    ch === '.');
}

function isAmPm(str) {
    return str === 'am' || str === 'pm';
}

function lookupValue(obj, str) {
    var keys = Object.keys(obj);
    var i, j, key, aliases;

    for (i = 0; i < keys.length; i++) {
        key = keys[i];

        if (key === str) {
            return key;
        }

        aliases = obj[key];
        for (j = 0; j < aliases.length; j++) {
            if (aliases[j] === str) {
                return key;
            }
        }
    }

    return null;
}

module.exports = {

};