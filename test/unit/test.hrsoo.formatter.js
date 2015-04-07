/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 *
 */
var name        = 'hrsoo.formatter';
var taste       = require('taste');
var formatter   = taste.target(name);

describe('UNIT ' + name, function () {
    describe('getTimeString()', function () {
        it('should convert 1130 to 11:30am', function () {
            formatter.getTimeString(1130).should.equal('11:30am');
        });

        it('should convert 0 to 12am', function () {
            formatter.getTimeString(0).should.equal('12am');
        });

        it('should convert 2400 to 12am', function () {
            formatter.getTimeString(2400).should.equal('12am');
        });

        it('should convert 1200 to 12pm', function () {
            formatter.getTimeString(1200).should.equal('12pm');
        });

        it('should convert 1530 to 3:30pm', function () {
            formatter.getTimeString(1530).should.equal('3:30pm');
        });
    });

    describe('formatTime()', function () {
        it('should return closed if no profile', function () {
            formatter.formatTime().should.equal('closed');
        });

        it('should return all day if allDay flag', function () {
            formatter.formatTime({ allDay: true }).should.equal('all day');
        });

        it('should return one formatted time range', function () {
            var timeProfile = {
                '500': true, '530': true, '600': true, '630': true
            };
            var expected = '5am-7am';
            var actual = formatter.formatTime(timeProfile);
            actual.should.equal(expected);
        });

        it('should return multiple ranges', function () {
            var timeProfile = {
                '500': true, '530': true, '600': true, '630': true,
                '1500': true, '1530': true, '1600': true
            };
            var expected = '5am-7am, 3pm-4:30pm';
            var actual = formatter.formatTime(timeProfile);
            actual.should.equal(expected);
        });

        it('should return multiple ranges with est to pst change', function () {
            var timeProfile = {
                '500': true, '530': true, '600': true, '630': true,
                '1500': true, '1530': true, '1600': true
            };
            var expected = '2am-4am, 12pm-1:30pm';
            var actual = formatter.formatTime(timeProfile, 'est', 'pst');
            actual.should.equal(expected);
        });
    });

    describe('stringify()', function () {
        it('should return 24-7 for every day all time', function () {
            formatter.stringify({ everyDayAllTime: true }, { type: 'short' }).should.equal('24-7');
        });

        it('should return days and times', function () {
            var hoursObj = {
                monday: { '500': true, '530': true, '600': true, '630': true },
                tuesday: { '500': true, '530': true, '600': true, '630': true },
                wednesday: { '500': true, '530': true, '600': true, '630': true },
                saturday: { '1500': true, '1530': true, '1600': true, '1630': true },
            };
            var expected = 'Mon-Wed 5am-7am, Sat 3pm-5pm EST';
            var actual = formatter.stringify(hoursObj);
            actual.should.equal(expected);
        });
    });

    describe('format()', function () {
        it('should change Friday 7 a.m. to 11 p.m. and Saturday 9 a.m. to 5 p.m. Eastern Time', function () {
            var hrsText = 'Friday 7 a.m. to 11 p.m. and Saturday 9 a.m. to 5 p.m. Eastern Time';
            var expected = 'Fri 7am-11pm, Sat 9am-5pm EST';
            var actual = formatter.format(hrsText);
            actual.should.equal(expected);
        });

        it('should change 24 hours, 7 days', function () {
            var hrsText = '24 hours, 7 days';
            var expected = '24 hours, 7 days';
            var actual = formatter.format(hrsText);
            actual.should.equal(expected);
        });

        it('should change Mon-Fri 7am-5pm, Sat-Sun 8:30am-5pm PST', function () {
            var hrsText = 'Mon-Fri 7am-5pm, Sat-Sun 8:30am-5pm PST';
            var expected = 'Mon-Fri 7am-5pm, Sat-Sun 8:30am-5pm PST';
            var actual = formatter.format(hrsText);
            actual.should.equal(expected);
        });
    });
});