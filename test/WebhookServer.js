/**
 * Created by desaroger on 23/02/17.
 */
/* eslint-disable global-require */

let _ = require('lodash');
let sinon = require('sinon');
let { expect, c, callApi, log } = require('./assets');
let WebhookServer = require('../src/WebhookServer');

let mocks = getMocks();

describe('webhookServer', () => {
    beforeEach(() => {
        log.restore();
    });

    it('is a function', () => {
        expect(WebhookServer).to.be.a('function');
    });

    it('can be instantiated', () => {
        expect(() => new WebhookServer()).to.not.throw();
    });

    describe('the instance', (whs, calls = 0) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    demo: {
                        type: 'github',
                        method() {
                            calls++;
                        }
                    }
                }
            });
        });
        afterEach(() => whs.stop());

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

        it('shows as running', () => {
            return whs.stop()
                .then(() => whs.start())
                .then(() => {
                    expect(whs.isRunning()).to.equal(true);
                });
        });
    });

    describe('call handler', (whs, calls = 0, method) => {
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    working: {
                        method() { calls++; }
                    },
                    withoutType: {
                        method() { calls++; }
                    },
                    throwsError: {
                        method() {
                            throw new Error('Test error');
                        }
                    },
                    throwsString: {
                        method() {
                            throw 'Test throw string'; // eslint-disable-line no-throw-literal
                        }
                    },
                    checkPayload: {
                        type: 'test',
                        method(...args) {
                            return method.call(this, ...args);
                        }
                    }
                }
            });
        });
        afterEach(() => {
            calls = 0;
            return whs.stop();
        });

        it('the server is actually listening', c(function* () {
            let spy = sinon.spy(whs, '_handleCall');
            yield whs.start();
            log.restore();

            // Logs
            log.mock((msg, status) => {
                expect(msg).to.match(/no route found on url/i);
                expect(status).to.equal(1);
            });
            yield callApi();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "asd" not found/i);
                expect(status).to.equal(1);
            });
            yield callApi('/asd');

            expect(spy.calledTwice).to.equal(true);
            spy.restore();
            expect(log.count).to.equal(2);
            log.checkMocks();
        }));

        it('returns success if the route works', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "working" was found/i);
                expect(status).to.equal(0);
            });
            let body = yield callApi('/working');
            expect(body).to.be.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "working" was found',
                code: 0
            });
            expect(calls).to.equal(1);
            expect(log.count).to.equal(1);
            log.checkMocks();
        }));

        it('works even though there is no type', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "withoutType" was found/i);
                expect(status).to.equal(0);
            });
            let body = yield callApi('/withoutType');
            expect(body).to.be.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "withoutType" was found',
                code: 0
            });
            expect(calls).to.equal(1);
            expect(log.count).to.equal(1);
            log.checkMocks();
        }));

        it('returns a warning if called a non-existent route', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "lol" not found/i);
                expect(status).to.equal(1);
            });
            let body = yield callApi('/lol');
            expect(body).to.be.deep.equal({
                $statusCode: 400,
                status: 'warning',
                message: 'Route "lol" not found',
                code: 1
            });
            expect(calls).to.equal(0);
            log.checkMocks();
        }));

        it('returns an error if the method triggers an error', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "throwsError" method error: Test error/i);
                expect(status).to.equal(2);
            });
            let body = yield callApi('/throwsError');
            expect(body).to.be.deep.equal({
                $statusCode: 500,
                status: 'error',
                message: 'Route "throwsError" method error: Test error',
                code: 2
            });
            expect(calls).to.equal(0);
            log.checkMocks();
        }));

        it('returns an error if the method triggers a value', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            log.mock((msg, status) => {
                expect(msg).to.match(/route "throwsString" method error: Test throw string/i);
                expect(status).to.equal(2);
            });
            let body = yield callApi('/throwsString');
            expect(body).to.be.deep.equal({
                $statusCode: 500,
                status: 'error',
                message: 'Route "throwsString" method error: Test throw string',
                code: 2
            });
            expect(calls).to.equal(0);
            log.checkMocks();
        }));

        it('pass the payload to the method', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();
            method = (payload) => {
                expect(payload).to.deep.equal({
                    name: 'pm2-hooks',
                    action: 'push',
                    branch: 'master'
                });
            };
            log.mock((msg, status) => {
                expect(msg).to.match(/route "checkPayload" was found/i);
                expect(status).to.equal(0);
            });
            let body = yield callApi(
                '/checkPayload',
                {
                    name: 'pm2-hooks',
                    action: 'push',
                    branch: 'master'
                }
            );
            expect(body).to.be.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "checkPayload" was found',
                code: 0
            });
            expect(calls).to.equal(0);
            log.checkMocks();
        }));

        it('handles unexpected errors', c(function* () {
            expect(calls).to.equal(0);
            yield whs.start();

            log.mock((msg, status) => {
                throw new Error('SuperError');
            }, { checkNow: true });
            log.mock((msg, status) => {
                expect(status).to.equal(2);
                expect(msg).to.match(/SuperError/);
            });
            let body = yield callApi(
                '/working',
                {
                    name: 'pm2-hooks',
                    action: 'push',
                    branch: 'master'
                }
            );
            expect(body).to.be.deep.equal({
                $statusCode: 500,
                status: 'error',
                message: 'Unexpected error: SuperError',
                code: 2
            });
            expect(calls).to.equal(1);
            log.checkMocks();
        }));

        it('throws an error if server previously listening', c(function* () {
            yield expect(whs.start()).to.be.fulfilled;
            yield expect(whs.start()).to.be.rejectedWith('Server previously started');
        }));
    });

    describe('_parseRequest', () => {
        let whs;
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    demo: {
                        method() {}
                    }
                }
            });
            sinon.spy(whs.options.routes.demo, 'method');
        });

        it('exists', () => {
            expect(whs._parseRequest).to.be.a('function');
        });

        it('logs on error', () => {
            let route = {
                type: 'github'
            };
            let req = {
                headers: {}
            };
            log.mock((msg, status) => {
                expect(msg).to.match(/Error for route type github: Invalid headers/i);
                expect(status).to.equal(2);
            });
            expect(() => whs._parseRequest(req, route))
                .to.throw(/Error for route type github: Invalid headers/);
            expect(log.count).to.equal(1);
            log.checkMocks();
        });

        it('throws if unknown type', () => {
            let route = {
                type: 'nope'
            };
            let req = {
                headers: {}
            };
            log.mock((msg, status) => {
                expect(msg).to.match(/Error unknown route type nope/i);
                expect(status).to.equal(2);
            });
            expect(() => whs._parseRequest(req, route))
                .to.throw(/Error unknown route type nope/);
            expect(log.count).to.equal(1);
            log.checkMocks();
        });

        describe('[github]', () => {
            it('checks the headers', () => {
                let route = {
                    type: 'github'
                };
                let req = {
                    headers: {}
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type github: Invalid headers/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type github: Invalid headers/);
                log.checkMocks();
            });

            it('doesn\'t throw if headers found', () => {
                let route = {};
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=asdadsa'
                    }
                };
                expect(() => whs._parseRequest(req, route)).to.not.throw();
            });

            it('checks if secret fails', () => {
                let route = {
                    secret: 'lol'
                };
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=nopenopenope'
                    },
                    body: 'superbody'
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type github: Invalid secret/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type github: Invalid secret/);
                log.checkMocks();
            });

            it('checks if secret works', () => {
                let route = {
                    secret: 'lol'
                };
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=241946ca6d19a74a9e52ea4b6a59ceb9c5cf309f'
                    },
                    body: '{"lol":"yeah"}'
                };
                expect(() => whs._parseRequest(req, route)).to.not.throw();
            });

            it('returns the action', () => {
                let route = {};
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=241949ceb9c5cf309f'
                    },
                    body: '{"lol":"yeah"}'
                };
                let result = whs._parseRequest(req, route);
                expect(result.action).to.equal('push');
            });

            it('returns the repository name', () => {
                let route = {};
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=241949ceb9c5cf309f'
                    },
                    body: JSON.stringify({
                        repository: {
                            name: 'pm2-hooks'
                        }
                    })
                };
                let result = whs._parseRequest(req, route);
                expect(result.name).to.equal('pm2-hooks');
            });

            it('returns the branch name', () => {
                let route = {};
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=241949ceb9c5cf309f'
                    },
                    body: JSON.stringify({
                        ref: 'refs/heads/develop',
                        repository: {
                            name: 'pm2-hooks'
                        }
                    })
                };
                let result = whs._parseRequest(req, route);
                expect(result.branch).to.equal('develop');
            });

            it('works with a payload key', () => {
                let route = {};
                let req = {
                    headers: {
                        'x-github-event': 'push',
                        'x-hub-signature': 'sha1=241949ceb9c5cf309f'
                    },
                    body: {
                        payload: JSON.stringify({
                            ref: 'refs/heads/develop',
                            repository: {
                                name: 'pm2-hooks'
                            }
                        })
                    }
                };
                let result = whs._parseRequest(req, route);
                expect(result.branch).to.equal('develop');
            });

            it('real example', () => {
                let mock = mocks.github.push;
                let route = {};
                let req = {
                    headers: mock.headers,
                    body: JSON.stringify(mock.body)
                };
                let result = whs._parseRequest(req, route);
                expect(result).to.deep.equal({
                    action: 'push',
                    branch: 'changes',
                    name: 'public-repo'
                });
            });
        });

        describe('[bitbucket]', () => {
            it('checks the headers', () => {
                let route = {
                    type: 'bitbucket'
                };
                let req = {
                    headers: {}
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type bitbucket: Invalid headers/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type bitbucket: Invalid headers/);
                log.checkMocks();
            });

            it('throw if no body found', () => {
                let route = {};
                let req = {
                    headers: mocks.bitbucket.push.headers,
                    body: {}
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type bitbucket: Invalid body/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type bitbucket: Invalid body/);
                log.checkMocks();
            });

            it('throw if body isn\'t an object', () => {
                let route = {};
                let req = {
                    headers: mocks.bitbucket.push.headers,
                    body: 'nope'
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type bitbucket: Invalid body/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type bitbucket: Invalid body/);
                log.checkMocks();
            });

            it('throw if uncapable of find the action', () => {
                let route = {};
                let req = {
                    headers: _.clone(mocks.bitbucket.push.headers),
                    body: {}
                };
                req.headers['X-Event-Key'] = 'repo:';
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type bitbucket: Invalid headers/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type bitbucket: Invalid headers/);
                log.checkMocks();
            });

            it('throw if invalid "changes" key found', () => {
                let route = {};
                let req = {
                    headers: mocks.bitbucket.push.headers,
                    body: {
                        push: {}
                    }
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type bitbucket: Invalid "changes" key on body/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type bitbucket: Invalid "changes" key on body/);
                log.checkMocks();
            });

            it('throws when there is a secret, as is not supported yet', () => {
                let route = {
                    type: 'bitbucket',
                    secret: 'lol'
                };
                let req = {
                    headers: mocks.bitbucket.push.headers,
                    body: {}
                };
                log.mock((msg, status) => {
                    expect(status).to.equal(2);
                    expect(msg).to.match(/Error for route type bitbucket: Secret not supported for bitbucket yet/);
                });
                expect(() => whs._parseRequest(req, route))
                    .to.throw(/Error for route type bitbucket: Secret not supported for bitbucket yet/);
                log.checkMocks();
            });

            it('returns the action', () => {
                let route = {};
                let req = mocks.bitbucket.push;
                let result = whs._parseRequest(req, route);
                expect(result.action).to.equal('push');
            });

            it('returns the repository name', () => {
                let route = {};
                let req = mocks.bitbucket.push;
                let result = whs._parseRequest(req, route);
                expect(result.name).to.equal('pm2-hooks');
            });

            it('returns the branch name', () => {
                let route = {};
                let req = mocks.bitbucket.push;
                let result = whs._parseRequest(req, route);
                expect(result.branch).to.equal('master');
            });
        });
    });

    describe('_getRouteName', () => {
        let whs, mockReq;
        before(() => {
            whs = new WebhookServer({
                port: 1234,
                routes: {
                    demo: {
                        method() {}
                    }
                }
            });
            sinon.spy(whs.options.routes.demo, 'method');
            mockReq = (url) => {
                return {
                    url
                };
            };
        });

        it('returns null if there is no url', () => {
            let req = mockReq('');
            expect(whs._getRouteName(req)).to.equal(null);
            req = mockReq('/');
            expect(whs._getRouteName(req)).to.equal(null);
            req = mockReq(' // ');
            expect(whs._getRouteName(req)).to.equal(null);
        });

        it('returns name despite it don\'t match', () => {
            let req = mockReq('/nope');
            expect(whs._getRouteName(req)).to.equal('nope');
            req = mockReq('/nope/nope');
            expect(whs._getRouteName(req)).to.equal('nope');
        });

        it('returns the match if matched', () => {
            let req = mockReq('/demo');
            expect(whs._getRouteName(req)).to.equal('demo');
            req = mockReq('/demo?asd=2');
            expect(whs._getRouteName(req)).to.equal('demo');
        });
    });
});

function getMocks() {
    return {
        bitbucket: {
            push: require('./mocks/bitbucket_push.json')
        },
        github: {
            push: require('./mocks/github_push.json')
        }
    };
}
