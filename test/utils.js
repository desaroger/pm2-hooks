/**
 * Created by desaroger on 7/03/17.
 */

let { expect, isPromise } = require('./assets');

describe('utils', () => {
    describe('[isPromise]', () => {
        it('is a function', () => {
            expect(isPromise).to.be.a('function');
        });

        it('returns false if falsy', () => {
            expect(isPromise()).to.equal(false);
            expect(isPromise(false)).to.equal(false);
            expect(isPromise(null)).to.equal(false);
        });

        it('returns false if non-object', () => {
            expect(isPromise('nope')).to.equal(false);
        });

        it('returns false if .then is not a function', () => {
            expect(isPromise({})).to.equal(false);
            expect(isPromise({ then: 'hi' })).to.equal(false);
        });

        it('returns false if .catch is not a function', () => {
            expect(isPromise({})).to.equal(false);
            expect(isPromise({ then: 'hi' })).to.equal(false);
            expect(isPromise({ then: 'hi', catch: 'hi' })).to.equal(false);
        });

        it('returns true if another case', () => {
            let promise = {
                then() {},
                catch() {}
            };
            expect(isPromise(promise)).to.equal(true);
        });
    });
});
