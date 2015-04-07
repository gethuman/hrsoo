/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 * Command line interface for the hours of operation interface
 */
var commander   = require('commander');
var formatter   = require('./hrsoo.formatter');

// initialize commander
commander
    .version('0.0.1')
    .option('-i, --hours [hours of operation]', 'Enter in your hours of operation.')
    .option('-t, --timezone [desired timezone]', 'Convert output into this timezone.')
    .parse(process.argv);

if (!commander.hours) {
    commander.help();
}

var timezone = commander.timezone || 'est';
var formattedHours = formatter.format(commander.hours, { timezone: timezone });
console.log(formattedHours);
