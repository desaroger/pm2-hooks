'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by desaroger on 25/02/17.
 */

var _ = require('lodash');
var childProcess = require('child_process');
var WebhookServer = require('./WebhookServer');

var _require = require('./utils'),
    log = _require.log,
    c = _require.c;

var Pm2Module = function () {
    function Pm2Module() {
        var processes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Pm2Module);

        options.routes = Pm2Module._parseProcesses(processes);
        this.routes = options.routes;
        this.webhookServer = new WebhookServer(options);
    }

    _createClass(Pm2Module, [{
        key: 'start',
        value: function start() {
            var _this = this;

            return this.webhookServer.start().then(function () {
                var msg = 'Started. Routes:\n';
                _.forOwn(_this.routes, function (route, name) {
                    msg += ' - ' + name + ': ' + JSON.stringify(route) + '\n';
                });
                log(msg);
            });
        }
    }, {
        key: 'stop',
        value: function stop() {
            return this.webhookServer.stop().then(function () {
                log('Stopped.');
            });
        }

        /**
         * Converts an array of PM2 processes to an object structured
         * for the WebhookServer routes. It internally uses the _parseProcess
         * method
         *
         * Example 1:
         * - input:
         * [
         *      { pm2_env: { env_hook: { name: 'api', type: 'bitbucket' } } },
         *      { pm2_env: { env_hook: { name: 'panel', type: 'github' } } }
         * ]
         * - output:
         * {
         *      api: { type: 'bitbucket' },
         *      panel: { type: 'github' }
         * }
         *
         * @param processes
         * @returns {*}
         * @private
         */

    }], [{
        key: '_parseProcesses',
        value: function _parseProcesses(processes) {
            return processes.map(function (p) {
                return Pm2Module._parseProcess(p);
            }).filter(function (p) {
                return !!p;
            }).reduce(function (routes, app) {
                routes[app.name] = app;
                delete app.name;
                return routes;
            }, {});
        }

        /**
         * Converts a PM2 process object to an object for WebhookServer
         * route.
         *
         * Example 1:
         * - input: { pm2_env: { env_hook: { name: 'api', type: 'bitbucket' } } }
         * - output: { name: 'api', type: 'bitbucket' }
         * Example 2:
         * - input: { pm2_env: { env_hook: { type: 'bitbucket' } } }
         * - output: { name: 'unknown', type: 'bitbucket' }
         *
         * @param app The Pm2 process
         * @returns {object|null} The route object, or null if invalid
         * @private
         */

    }, {
        key: '_parseProcess',
        value: function _parseProcess(app) {
            // Check data
            if (!app || !app.pm2_env) {
                return null;
            }
            var config = app.pm2_env.env_hook;
            if (!config) {
                log('No options found for "' + app.name + '" route');
                return null;
            }
            if (config === true) {
                config = {};
            }

            // Config to WebhookServer route
            var self = this;
            var name = app.name || 'unknown';
            var commandOptions = Object.assign({}, { cwd: config.cwd || app.pm2_env.cwd }, config.commandOptions || {});
            var route = {
                name: name,
                type: config.type,
                method: c( /*#__PURE__*/regeneratorRuntime.mark(function _callee(payload) {
                    var err;
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                        while (1) {
                            switch (_context.prev = _context.next) {
                                case 0:
                                    log('Parsed payload: ' + JSON.stringify(payload));
                                    _context.prev = 1;

                                    if (!config.command) {
                                        _context.next = 6;
                                        break;
                                    }

                                    log('Running command: ' + config.command);
                                    _context.next = 6;
                                    return self._runCommand(config.command, commandOptions);

                                case 6:
                                    _context.next = 13;
                                    break;

                                case 8:
                                    _context.prev = 8;
                                    _context.t0 = _context['catch'](1);
                                    err = _context.t0.message || _context.t0;

                                    log('Error on "' + name + '" route: ' + err, 2);
                                    throw _context.t0;

                                case 13:
                                case 'end':
                                    return _context.stop();
                            }
                        }
                    }, _callee, this, [[1, 8]]);
                }))
            };
            route = cleanObj(route);

            return route;
        }

        /**
         * Runs a line command.
         *
         * @param {String} command The line to execute
         * @param {Object} options The object options
         * @returns {Promise<code>} The code of the error, or a void fulfilled promise
         * @private
         */

    }, {
        key: '_runCommand',
        value: function _runCommand(command) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            _.defaults(options, {
                env: process.env,
                shell: true
            });
            return new Promise(function (resolve, reject) {
                var child = childProcess.spawn('eval', [command], options);
                child.on('close', function (code) {
                    if (!code) {
                        resolve();
                    } else {
                        reject(code);
                    }
                });
            });
        }
    }]);

    return Pm2Module;
}();

module.exports = Pm2Module;

function cleanObj(obj) {
    return _(obj).omitBy(_.isUndefined).value();
}