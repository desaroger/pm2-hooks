/**
 * Created by desaroger on 25/02/17.
 */

let _ = require('lodash');
let Pm2Module = require('../src/Pm2Module');
let WebhookServer = require('../src/WebhookServer');
let mockApps = require('./mocks/apps');
let { expect, c, callApi, mockSpawn } = require('./assets');

describe('Pm2Module', () => {
    it('is a function', () => {
        expect(Pm2Module).to.be.a('function');
    });

    it('can be instantiated', () => {
        expect(() => new Pm2Module()).to.not.throw();
    });

    describe('instance', (pm2Module) => {
        before(() => {
            let apps = [
                wrapEnv('a', { type: 'github' }),
                wrapEnv('b', { type: 'bitbucket' }),
                wrapEnv('c', { type: 'gitlab' }),
                wrapEnv('d', { })
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
                wrapEnv('a', {
                    type: 'github',
                    command: 'echo hi'
                }),
                wrapEnv('b', {
                    type: 'gitlab',
                    command: 'echo-nope hi'
                })
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
            let result = yield callApi('/nope');
            expect(result).to.shallowDeepEqual({
                status: 'warning',
                message: 'Route "nope" not found',
                code: 1
            });
        }));

        it('runs the command', c(function* () {
            mockSpawn.start((command, options) => {
                expect(command).to.equal('echo hi');
            });
            let result = yield callApi('/a');
            expect(result).to.shallowDeepEqual({
                status: 'success',
                message: 'Route "a" was found',
                code: 0
            });
        }));

        it.skip('shows error if command error', c(function* () {
            mockSpawn.start(() => {
                return function (cb) {
                    this.emit('close', 'asd');
                    this.stdout.write('output data my library expects');
                    return cb(2); // and exit 0
                };
            });
            let result = yield callApi('/a');
            expect(result).to.shallowDeepEqual({
                status: 'success',
                message: 'Route "a" was found',
                code: 0
            });
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
            _.values(objs)
                .forEach((opts) => {
                    expect(Pm2Module._parseProcess(opts)).to.equal(null);
                });
        });

        it('returns the route if valid object', () => {
            let obj = wrapEnv('lol', { type: 'bitbucket' });
            let result = Pm2Module._parseProcess(obj);
            expect(result).to.shallowDeepEqual({
                name: 'lol',
                type: 'bitbucket'
            });
        });

        it('returns the route if equal true', () => {
            let obj = wrapEnv('lol', true);
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
            return Pm2Module._runCommand('ecssssho hi')
                .catch((err) => {
                    expect(err).to.be.ok;
                });
        });
    });
});

function wrapEnv(name, envHook = {}) {
    return { name, pm2_env: { env_hook: envHook } };
}
