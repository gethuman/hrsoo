/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 *
 */
var name    = 'hrsoo.lexer';
var taste   = require('taste');
var lexer   = taste.target(name);
var utils   = taste.target('hrsoo.utils');

describe('UNIT ' + name, function () {
    describe('readString()', function () {
        it('should return nothing if no valid letters', function () {
            var state = { text: '', index: 0 };
            var expected = { text: '', index: 0 };
            var actual = lexer.readString(state);
            actual.should.deep.equal(expected);
        });

        it('should return token with ampm', function () {
            var state = { text: '8:30 AM PST', index: 5 };
            var expectedTokens = [{ type: 'ampm', value: 'am' }];
            var expected = { text: '8:30 AM PST', index: 7, tokens: expectedTokens };
            var actual = lexer.readString(state);
            actual.should.deep.equal(expected);
        });

        it('should get a timezone', function () {
            var state = { text: '8:30 MT', index: 5 };
            var expectedTokens = [{ type: 'timezone', value: 'mst' }];
            var expected = { text: '8:30 MT', index: 7, tokens: expectedTokens };
            var actual = lexer.readString(state);
            actual.should.deep.equal(expected);
        });

        it('should get an operation', function () {
            var state = { text: '8:30 to 9', index: 5 };
            var expectedTokens = [{ type: 'operation', value: 'through' }];
            var expected = { text: '8:30 to 9', index: 7, tokens: expectedTokens };
            var actual = lexer.readString(state);
            actual.should.deep.equal(expected);
        });

        it('should get a day', function () {
            var state = { text: '8:30 su', index: 5 };
            var expectedTokens = [{ type: 'day', value: 'sunday' }];
            var expected = { text: '8:30 su', index: 7, tokens: expectedTokens };
            var actual = lexer.readString(state);
            actual.should.deep.equal(expected);
        });
    });

    describe('readTime()', function () {
        it('should read in a hrs with no minutes', function () {
            var state = { text: 'this 8am', index: 5 };
            var expectedTokens = [{ type: 'time', hrs: 8, mins: 0 }];
            var expected = { text: 'this 8am', index: 6, tokens: expectedTokens };
            var actual = lexer.readTime(state);
            actual.should.deep.equal(expected);
        });

        it('should read in a hrs with minutes', function () {
            var state = { text: 'this 08:30 am', index: 5 };
            var expectedTokens = [{ type: 'time', hrs: 8, mins: 30 }];
            var expected = { text: 'this 08:30 am', index: 10, tokens: expectedTokens };
            var actual = lexer.readTime(state);
            actual.should.deep.equal(expected);
        });
    });

    describe('checkCommonHours()', function () {
        it('should replace eastern standard time and pacific standard time', function () {
            var state = { text: '8:30am (eastern standard time) (pacific standard time)' };
            var expected = { text: '8:30am (est) (pst)', tokens: [] };
            var actual = lexer.checkCommonHours(state);
            actual.should.deep.equal(expected);
        });

        it('should convert 24-7', function () {
            var state = { text: '24 hours, 7 days' };
            var expectedTokens = [{ type: 'timerange', start: 0, end: 2400 }, { type: 'days', value: utils.daysOfWeek }];
            var expected = { text: ', ', tokens: expectedTokens };
            var actual = lexer.checkCommonHours(state);
            actual.should.deep.equal(expected);
        });
    });

    describe('getTokens()', function () {
        it('should find no tokens for an empty string', function () {
            var hoursText = '';
            var expected = [];
            var actual = lexer.getTokens(hoursText);
            actual.should.deep.equal(expected);
        });

        it('should find tokens for Monday-Friday 8:30am-5pm', function () {
            var hoursText = 'Monday-Friday 8:30am-5pm';
            var expected = [
                { type: 'day', value: 'monday' },
                { type: 'operation', value: 'through' },
                { type: 'day', value: 'friday' },
                { type: 'time', hrs: 8, mins: 30 },
                { type: 'ampm', value: 'am' },
                { type: 'operation', value: 'through' },
                { type: 'time', hrs: 5, mins: 0 },
                { type: 'ampm', value: 'pm' }
            ];
            var actual = lexer.getTokens(hoursText);
            actual.should.deep.equal(expected);
        });

        it('should find tokens for 24 hours, 7 days', function () {
            var hoursText = '24 hours, 7 days';
            var expected = [
                { type: 'timerange', start: 0, end: 2400 },
                { type: 'days', value: utils.daysOfWeek }
            ];
            var actual = lexer.getTokens(hoursText);
            actual.should.deep.equal(expected);
        });

        it('should find tokens for Mon-Fri 7am-5pm, Sat-Sun 8:30am-5pm PST', function () {
            var hoursText = 'Mon-Fri 7am-5pm, Sat-Sun 8:30am-5pm PST';
            var expected = [
                { type: 'day', value: 'monday' },
                { type: 'operation', value: 'through' },
                { type: 'day', value: 'friday' },
                { type: 'time', hrs: 7, mins: 0 },
                { type: 'ampm', value: 'am' },
                { type: 'operation', value: 'through' },
                { type: 'time', hrs: 5, mins: 0 },
                { type: 'ampm', value: 'pm' },
                { type: 'day', value: 'saturday' },
                { type: 'operation', value: 'through' },
                { type: 'day', value: 'sunday' },
                { type: 'time', hrs: 8, mins: 30 },
                { type: 'ampm', value: 'am' },
                { type: 'operation', value: 'through' },
                { type: 'time', hrs: 5, mins: 0 },
                { type: 'ampm', value: 'pm' },
                { type: 'timezone', value: 'pst' }
            ];
            var actual = lexer.getTokens(hoursText);
            actual.should.deep.equal(expected);
        });

        it('should find tokens for 7 a.m. to 11 p.m. and Saturday 9 a.m. to 5 p.m. Eastern Time', function () {
            var hoursText = '7 a.m. to 11 p.m. and Saturday 9 a.m. to 5 p.m. Eastern Time';
            var expected = [
                { type: 'time', hrs: 7, mins: 0 },
                { type: 'ampm', value: 'am' },
                { type: 'operation', value: 'through' },
                { type: 'time', hrs: 11, mins: 0 },
                { type: 'ampm', value: 'pm' },
                { type: 'operation', value: 'and' },
                { type: 'day', value: 'saturday' },
                { type: 'time', hrs: 9, mins: 0 },
                { type: 'ampm', value: 'am' },
                { type: 'operation', value: 'through' },
                { type: 'time', hrs: 5, mins: 0 },
                { type: 'ampm', value: 'pm' },
                { type: 'timezone', value: 'est' }
            ];
            var actual = lexer.getTokens(hoursText);
            actual.should.deep.equal(expected);
        });
    });
});