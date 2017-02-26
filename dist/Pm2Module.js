'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by desaroger on 25/02/17.
 */

var _ = require('lodash');
var co = require('co');
var childProcess = require('child_process');
var WebhookServer = require('./WebhookServer');

var _require = require('./utils'),
    log = _require.log;

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
         * @param process The Pm2 process
         * @returns {object|null} The route object, or null if invalid
         * @private
         */

    }, {
        key: '_parseProcess',
        value: function _parseProcess(process) {
            // Check data
            if (!process) {
                return null;
            }
            var processOptions = _.get(process, 'pm2_env.env_hook');
            if (!processOptions) {
                return null;
            }
            var data = _.get(process, 'pm2_env.env_hook');
            if (data === true) {
                data = {};
            }

            // Data to WebhookServer route
            var self = this;
            var name = process.name || 'unknown';
            var route = {
                name: name,
                type: data.type,
                method: co.wrap(regeneratorRuntime.mark(function _callee() {
                    var err;
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                        while (1) {
                            switch (_context.prev = _context.next) {
                                case 0:
                                    _context.prev = 0;

                                    if (!data.command) {
                                        _context.next = 5;
                                        break;
                                    }

                                    log('Running command: ' + data.command);
                                    _context.next = 5;
                                    return self._runCommand(data.command);

                                case 5:
                                    _context.next = 12;
                                    break;

                                case 7:
                                    _context.prev = 7;
                                    _context.t0 = _context['catch'](0);
                                    err = _context.t0.message || _context.t0;

                                    log(name + ': Error: ' + err, 2);
                                    throw _context.t0;

                                case 12:
                                case 'end':
                                    return _context.stop();
                            }
                        }
                    }, _callee, this, [[0, 7]]);
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