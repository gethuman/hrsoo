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
