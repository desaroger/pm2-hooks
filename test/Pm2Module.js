/**
 * Created by desaroger on 25/02/17.
 */

let _ = require('lodash');
let Pm2Module = require('../src/Pm2Module');
let WebhookServer = require('../src/WebhookServer');
let mockApps = require('./mocks/apps');
let { expect, c, callApi, mockSpawn, log } = require('./assets');

describe('Pm2Module', () => {
    afterEach(() => {
        log.restore();
    });

    it('is a function', () => {
        expect(Pm2Module).to.be.a('function');
    });

    it('can be instantiated', () => {
        expect(() => new Pm2Module()).to.not.throw();
    });

    describe('instance', (pm2Module) => {
        before(() => {
            let apps = [
                wrapEnv({ name: 'a' }, { type: 'github' }),
                wrapEnv({ name: 'b' }, { type: 'bitbucket' }),
                wrapEnv({ name: 'c' }, { type: 'gitlab' }),
                wrapEnv({ name: 'd' }, { })
            ];
            pm2Module = new Pm2Module(apps);
        });

        it('has the method start', () => {
            expect(pm2Module.start).to.be.a('function');
        });

        it('has the method stop', () => {
            expect(pm2Module.stop).to.be.a('function');
        });

        it('has created the server, but not started', () => {
            expect(pm2Module.webhookServer).to.be.an.instanceOf(WebhookServer);
            expect(pm2Module.webhookServer.isRunning()).to.equal(false);
        });

        it('the server has the routes created', () => {
            let routes = pm2Module.webhookServer.options.routes;
            expect(routes.a).to.shallowDeepEqual({ type: 'github' });
            expect(routes.b).to.shallowDeepEqual({ type: 'bitbucket' });
            expect(routes.c).to.shallowDeepEqual({ type: 'gitlab' });
            expect(routes.d).to.be.an('object');
            expect(routes.d.type).to.not.be.ok;
        });
    });

    describe('[run commands]', (pm2Module) => {
        before(() => {
            let apps = [
                wrapEnv({
                    name: 'a'
                }, {
                    command: 'echo hi',
                    cwd: '/home/desaroger'
                }),
                wrapEnv({
                    name: 'b',
                    pm_cwd: '/home/lol'
                }, {
                    command: 'echo-nope hi'
                }),
                wrapEnv({
                    name: 'c',
                    pm_cwd: '/home/nope'
                }, {
                    command: 'echo yeah',
                    cwd: '/home/yeah'
                }),
                wrapEnv({
                    name: 'd',
                    pm_cwd: '/home/nope'
                }, {})
            ];
            pm2Module = new Pm2Module(apps, {
                port: 1234
            });
            return pm2Module.start();
        });
        after(() => pm2Module.stop());
        afterEach(() => mockSpawn.restore());

        it('is running', () => {
            expect(pm2Module.webhookServer.isRunning()).to.equal(true);
        });

        it('returns the warning if not found', c(function* () {
            log.mock((msg, status) => {
                expect(msg).to.match(/route "nope" not found/i);
                expect(status).to.equal(1);
            });
            let result = yield callApi('/nope');
            expect(result).to.deep.equal({
                $statusCode: 400,
                status: 'warning',
                message: 'Route "nope" not found',
                code: 1
            });
            expect(log.count).to.equal(1);
            log.checkMocks();
        }));

        it('runs the command', c(function* () {
            mockSpawn.start((command, options) => {
                expect(command).to.equal('echo hi');
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Parsed payload: \{}/);
            });
            log.mock((msg, status) => {
                expect(msg).to.match(/running command: echo hi/i);
                expect(status).to.equal(0);
            });
            log.mock((msg, status) => {
                expect(msg).to.match(/route "a" was found/i);
                expect(status).to.equal(0);
            });
            let result = yield callApi('/a');
            expect(result).to.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "a" was found',
                code: 0
            });
            expect(log.count).to.equal(3);
            log.checkMocks();
        }));

        it('doesn\'t throw if no command', c(function* () {
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Parsed payload: \{}/);
            });
            log.mock((msg, status) => {
                expect(msg).to.match(/route "d" was found/i);
                expect(status).to.equal(0);
            });
            let result = yield callApi('/d');
            expect(result).to.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "d" was found',
                code: 0
            });
            expect(log.count).to.equal(2);
            log.checkMocks();
        }));

        it('runs the command in the CWD if available on config', c(function* () {
            mockSpawn.start((command, options) => {
                expect(options).to.be.an('object');
                expect(options.cwd).to.equal('/home/desaroger');
                expect(command).to.equal('echo hi');
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Parsed payload: \{}/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Running command: echo hi/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Success: Route "a" was found/);
            });
            let result = yield expect(callApi('/a')).to.be.fulfilled;
            expect(result).to.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "a" was found',
                code: 0
            });
            log.checkMocks();
        }));

        it('runs the command in the CWD with the app cwd if no present config', c(function* () {
            mockSpawn.start((command, options) => {
                expect(options).to.be.an('object');
                expect(options.cwd).to.equal('/home/lol');
                expect(command).to.equal('echo-nope hi');
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Parsed payload: \{}/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Running command: echo-nope hi/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Success: Route "b" was found/);
            });
            let result = yield expect(callApi('/b')).to.be.fulfilled;
            expect(result).to.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "b" was found',
                code: 0
            });
            log.checkMocks();
        }));

        it('runs the command in the CWD with priority to the config', c(function* () {
            mockSpawn.start((command, options) => {
                expect(options).to.be.an('object');
                expect(options.cwd).to.equal('/home/yeah');
                expect(command).to.equal('echo yeah');
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Parsed payload: \{}/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Running command: echo yeah/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Success: Route "c" was found/);
            });
            let result = yield expect(callApi('/c')).to.be.fulfilled;
            expect(result).to.deep.equal({
                $statusCode: 200,
                status: 'success',
                message: 'Route "c" was found',
                code: 0
            });
            log.checkMocks();
        }));

        it('shows error if command error', c(function* () {
            mockSpawn.start(() => {
                return function (cb) {
                    this.emit('close', 'asd');
                    return cb(2);
                };
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Parsed payload: \{}/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/Running command: echo hi/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(2);
                expect(msg).to.match(/Error on "a" route: asd/);
            });
            log.mock((msg, status) => {
                expect(status).to.equal(2);
                expect(msg).to.match(/Error: Route "a" method error: asd/);
            });
            let result = yield callApi('/a');
            expect(result).to.deep.equal({
                $statusCode: 500,
                status: 'error',
                message: 'Route "a" method error: asd',
                code: 2
            });
            log.checkMocks();
        }));
    });

    describe('method _parseProcesses', () => {
        it('exists', () => {
            expect(Pm2Module._parseProcesses).to.be.a('function');
        });

        it('accepts a void array', () => {
            let result = Pm2Module._parseProcesses([]);
            expect(result).to.deep.equal({});
        });

        it('sets "unknown" as default name', () => {
            let result = Pm2Module._parseProcesses([wrapEnv()]);
            expect(Object.keys(result)).to.have.length(1);
            expect(result.unknown).to.be.ok;
        });

        it('works with a real processes array', () => {
            let result = Pm2Module._parseProcesses(mockApps);
            expect(result).to.have.all.keys(['api', 'api2', 'panel']);
            expect(result).to.shallowDeepEqual({
                api: {
                    type: 'bitbucket'
                },
                api2: {},
                panel: {
                    type: 'gitlab'
                }
            });
        });
    });

    describe('method _parseProcess', () => {
        it('exists', () => {
            expect(Pm2Module._parseProcess).to.be.a('function');
        });

        it('returns false if no options specified', () => {
            let objs = {
                a: undefined,
                b: null,
                c: {},
                d: { pm2_env: {} }
            };
            let mockLog = (msg, status) => {
                expect(status).to.equal(0);
                expect(msg).to.match(/No options found for "undefined" route/);
            };
            log.mock(mockLog);

            _.values(objs)
                .forEach((opts) => {
                    expect(Pm2Module._parseProcess(opts)).to.equal(null);
                });
            expect(log.count).to.equal(1);
            log.checkMocks();
        });

        it('returns the route if valid object', () => {
            let obj = wrapEnv({ name: 'lol' }, { type: 'bitbucket' });
            let result = Pm2Module._parseProcess(obj);
            expect(result).to.shallowDeepEqual({
                name: 'lol',
                type: 'bitbucket'
            });
        });

        it('returns the route if equal true', () => {
            let obj = wrapEnv({ name: 'lol' }, true);
            let result = Pm2Module._parseProcess(obj);
            expect(result).to.shallowDeepEqual({
                name: 'lol'
            });
        });
    });

    describe('method _runCommand', () => {
        it('exists', () => {
            expect(Pm2Module._runCommand).to.be.a('function');
        });

        it('returns a promise', () => {
            let result = Pm2Module._runCommand('echo hi');
            expect(result).to.be.ok;
            expect(result.then).to.be.a('function');
            expect(result.catch).to.be.a('function');
        });

        it('runs the line', () => {
            return Pm2Module._runCommand('echo hi')
                .then((result) => {
                    expect(result).to.not.be.ok;
                })
                .catch((err) => {
                    expect(err).to.not.be.ok;
                });
        });

        it('throws an error if fails', () => {
            return Pm2Module._runCommand('765-this-need-to-not-exists-231 hi')
                .catch((err) => {
                    expect(err).to.be.ok;
                });
        });
    });
});

/**
 * Creates an object with the same structure as the PM2 process
 * Example structure:
 * {
 *      name: 'api',
 *      pm2_env: {
 *          env: {},
 *          env_hooks: {
 *              command: 'echo hi'
 *          }
 *      }
 * }
 *
 * @param {object} appData The root object
 * @param {object} envHook The object inside 'pm2_env.env_hooks' path
 * @returns {object} The built object
 */
function wrapEnv(appData = {}, envHook = {}) {
    appData.pm2_env = { env_hook: envHook };
    return appData;
}
