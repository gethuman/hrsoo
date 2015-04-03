/**
 * Author: Jeff Whelpley
 * Date: 4/3/15
 *
 *
 */
var name    = 'hrsoo.utils';
var taste   = require('taste');
var utils   = taste.target(name);

describe('UNIT ' + name, function () {
    describe('isLetter()', function () {
        it('should return false for a non letter', function () {
            return utils.isLetter('1').should.be.false;
        });
        it('should return true for a letter', function () {
            return utils.isLetter('a').should.be.true;
        });
    });

    describe('isNumber()', function () {
        it('should return true for a number', function () {
            return utils.isNumber('1').should.be.true;
        });
        it('should return false for a letter', function () {
            return utils.isNumber('a').should.be.false;
        });
    });

    describe('isSkipChar()', function () {
        it('should return true for a period', function () {
            return utils.isSkipChar('.').should.be.true;
        });
        it('should return false for a letter', function () {
            return utils.isSkipChar('a').should.be.false;
        });
    });

    describe('lookupAlias()', function () {
        it('should lookup alias for sunday', function () {
            var day = 'su';
            var expected = 'sunday';
            var actual = utils.lookupAlias('days', day);
            actual.should.equal(expected);
        });
    });
});