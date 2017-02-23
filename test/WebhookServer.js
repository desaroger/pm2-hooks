/**
 * Created by desaroger on 23/02/17.
 */

let sinon = require('sinon');
let urlJoin = require('url-join');
let r = require('request-promise');
let { expect, c } = require('./assets');
let WebhookServer = require('../src/WebhookServer');

let G = c;
let baseApi = 'http://localhost:1234';
let apiResolve = path => urlJoin(baseApi, path);
describe('webhookServer', () => {
    it('is a function', () => {
        expect(WebhookServer).to.be.a('function');
    });

    it('can be instantiated', () => {
        expect(() => new WebhookServer()).to.not.throw();
    });

    describe('the instance', (whs) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234
            });
        });
        afterEach(() => {
            return whs.stop();
        });

        it('not has the server created', () => {
            expect(whs.server).to.not.be.ok;
        });

        it('has the expected methods', () => {
            expect(whs.isRunning).to.be.a('function');
            expect(whs.start).to.be.a('function');
            expect(whs.stop).to.be.a('function');
        });

        it('is not running initially', () => {
            expect(whs.isRunning()).to.equal(false);
        });

        it('can be started', () => {
            return expect(whs.start()).to.eventually.be.fulfilled;
        });

        it('the server is actually listening', G(function* () {
            let spy = sinon.spy(whs, '_handleCall');
            yield whs.start();
            yield r(apiResolve());
            yield r(apiResolve('/asd'));
            expect(spy.calledTwice).to.equal(true);
        }));
    });

    describe('_guessRoute', (whs, spy, mockReq) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    demo() {}
                }
            });
            spy = sinon.spy(whs.options.routes, 'demo');
            mockReq = (url) => {
                return {
                    url
                };
            };
        });

        it('returns null if there is no url', () => {
            let req = mockReq('');
            expect(whs._guessRoute(req)).to.equal(null);
            req = mockReq('/');
            expect(whs._guessRoute(req)).to.equal(null);
            req = mockReq(' // ');
            expect(whs._guessRoute(req)).to.equal(null);
        });

        it('returns null if there is no match', () => {
            let req = mockReq('/nope');
            expect(whs._guessRoute(req)).to.equal(null);
            req = mockReq('/nope/nope');
            expect(whs._guessRoute(req)).to.equal(null);
        });

        it('returns the match if matched', () => {
            let req = mockReq('/demo');
            expect(whs._guessRoute(req)).to.equal('demo');
            req = mockReq('/demo?asd=2');
            expect(whs._guessRoute(req)).to.equal('demo');
        });
    });
});
