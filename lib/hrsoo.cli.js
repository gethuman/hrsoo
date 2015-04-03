/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Command line interface for the hours of operation interface
 */
var commander   = require('commander');
//var parser      = require('./hrsoo.parser');
//var formatter   = require('./hrsoo.formatter');

// initialize commander
commander
    .version('0.0.1')
    .option('-t, --tpl [templateFilePath|template]', 'This does not work yet. Still testing out.')
    .parse(process.argv);

// get params
//var template = commander.tpl;
console.log('this tool is not yet implemented');
