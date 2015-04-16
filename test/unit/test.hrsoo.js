/**
 * Author: Jeff Whelpley
 * Date: 4/16/15
 *
 * This test will use the fixtures to validate this lib at the top level.
 * This is obviously just calling hrsoo.formatter.format(), but keeping
 * tests separate so that this one always uses the fixtures while the
 * other unit test are more specific.
 */
var name    = 'hrsoo';
var taste   = require('taste');
var hrsoo   = taste.target(name);
var fs      = require('fs');
var path    = require('path');

/**
 * Main function for testing out all fixtures. We will have different unit
 * tests below for different variations of options.
 * @param options
 */
function testFixtures(options) {
    var fileName = path.normalize(__dirname + '/../fixtures/hours.csv');
    var file = fs.readFileSync(fileName, { encoding: 'utf8' });
    var fixtures = file.split('\n');
    var i, fixture, hours, normalized;

    for (i = 30; i < 40; i++) {
        fixture = fixtures[i];
        hours = fixture.replace(/"/g, '').trim();


        console.log('\n' + i + 'orig: ' + hours);
        normalized = hrsoo.format(hours, options);
        console.log(i + 'now:  ' + normalized + '\n');

        //TODO: check against something here
    }

    console.log('done');
}

describe('UNIT ' + name, function () {
    describe('format()', function () {

        //it('should test specific use case', function () {
        //    var hours = '8:00am and 8:00pm ET';
        //    var expected = '8am-8pm EST';
        //    var actual = hrsoo.format(hours);
        //    actual.should.equal(expected);
        //});

        it('should validate all fixtures with default settings', function () {
            testFixtures(null);
        });
    });
});