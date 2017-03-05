'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by desaroger on 23/02/17.
 */

var _ = require('lodash');
var http = require('http');
var bodyParser = require('body-parser');
var crypto = require('crypto');

var _require = require('./utils'),
    log = _require.log,
    c = _require.c,
    isPromise = _require.isPromise;

var WebhookServer = function () {

    /**
     * @param {object} options The options
     * @constructor
     */
    function WebhookServer() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, WebhookServer);

        _.defaults(options, {
            port: process.env.PORT || 9000,
            routes: {}
        });
        for (var name in options.routes) {
            if (!options.routes.hasOwnProperty(name)) continue;
            options.routes[name].name = name;
        }
        this.options = options;
    }

    /**
     * Creates the server and start it (with .listen)
     *
     * @returns {Promise<WebhookServer>} Returns the instance
     */


    _createClass(WebhookServer, [{
        key: 'start',
        value: function start() {
            var _this = this;

            return new Promise(function (resolve, reject) {
                _this.server = http.createServer(_this._handleCall.bind(_this));
                _this.server.listen(_this.options.port, function (err) {
                    if (err) return reject(err);
                    resolve(_this);
                });
            });
        }

        /**
         * Stops the server. Doesn't throws an error if fails.
         *
         * @returns {Promise<WebhookServer>} Returns the instance
         */

    }, {
        key: 'stop',
        value: function stop() {
            var _this2 = this;

            return new Promise(function (resolve) {
                if (!_this2.server) {
                    return resolve(_this2);
                }
                _this2.server.close(function () {
                    resolve(_this2);
                });
            });
        }

        /**
         * This method is the main function of the http server.
         * Given a request, it finds out the matched route and
         * calls the method of the route.
         *
         * @param {http.IncomingMessage} req The Request of the call
         * @param {http.ServerResponse} res The Response of the call
         * @private
         */

    }, {
        key: '_handleCall',
        value: function _handleCall(req, res) {
            var self = this;
            bodyParser.urlencoded({
                extended: true
            })(req, res, c(regeneratorRuntime.mark(function _callee() {
                var routeName, route, payload, result, message, msg;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.prev = 0;

                                // Mock
                                routeName = self._getRouteName(req);

                                if (routeName) {
                                    _context.next = 6;
                                    break;
                                }

                                log('No route found on url', 1);
                                res.end(JSON.stringify({
                                    status: 'warning',
                                    message: 'No route found on url',
                                    code: 1
                                }));
                                return _context.abrupt('return');

                            case 6:
                                route = self.options.routes[routeName];

                                if (route) {
                                    _context.next = 11;
                                    break;
                                }

                                log('Warning: Route "' + routeName + '" not found', 1);
                                res.end(JSON.stringify({
                                    status: 'warning',
                                    message: 'Route "' + routeName + '" not found',
                                    code: 1
                                }));
                                return _context.abrupt('return');

                            case 11:

                                // Prepare the execution of the method
                                payload = self._parseRequest(req, route);
                                result = void 0;
                                _context.prev = 13;

                                result = route.method(payload);

                                if (!isPromise(result)) {
                                    _context.next = 19;
                                    break;
                                }

                                _context.next = 18;
                                return result;

                            case 18:
                                result = _context.sent;

                            case 19:
                                _context.next = 27;
                                break;

                            case 21:
                                _context.prev = 21;
                                _context.t0 = _context['catch'](13);
                                message = _context.t0.message ? _context.t0.message : _context.t0;

                                log('Error: Route "' + routeName + '" method error: ' + message, 2);
                                res.end(JSON.stringify({
                                    status: 'error',
                                    message: 'Route "' + routeName + '" method error: ' + message,
                                    code: 2
                                }));
                                return _context.abrupt('return');

                            case 27:

                                log('Success: Route "' + routeName + '" was found', 0);
                                res.end(JSON.stringify({
                                    status: 'success',
                                    message: 'Route "' + routeName + '" was found',
                                    code: 0,
                                    result: result
                                }));
                                _context.next = 36;
                                break;

                            case 31:
                                _context.prev = 31;
                                _context.t1 = _context['catch'](0);
                                msg = _context.t1.message ? _context.t1.message : _context.t1;

                                log(msg, 2);
                                res.end(JSON.stringify({
                                    status: 'error',
                                    message: 'Unexpected error: ' + msg,
                                    code: 2
                                }));

                            case 36:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[0, 31], [13, 21]]);
            })));
        }

        /**
         * Given a request, returns the matched route
         *
         * @param {http.IncomingMessage} req The Request of the call
         * @returns {string|null} The matched route or null if not
         * @private
         */

    }, {
        key: '_getRouteName',
        value: function _getRouteName(req) {
            var path = trimSlashes(req.url);
            var name = path.split('/')[0];
            name = name.split('?')[0];
            if (!name) {
                return null;
            }

            return name;
        }
    }, {
        key: '_parseRequest',
        value: function _parseRequest(req, route) {
            route = Object.assign({
                name: '<unknown>',
                type: 'auto',
                secret: false
            }, route);

            // Auto-type
            if (route.type === 'auto') {
                if (req.headers['x-github-event']) {
                    route.type = 'github';
                }
                if (route.type === 'auto') {
                    route.type = false;
                }
            }

            var result = {};
            if (route.type) {
                // Checks
                var checksMap = {
                    github: function github() {
                        var error = false;
                        if (!req.headers['x-github-event'] || !req.headers['x-hub-signature']) {
                            error = 'Invalid headers';
                        } else if (route.secret) {
                            var hash = crypto.createHmac('sha1', route.secret);
                            hash = hash.update(req.body).digest('hex');
                            if ('sha1=' + hash !== req.headers['x-hub-signature']) {
                                error = 'Invalid secret';
                            }
                        }
                        return error;
                    },
                    test: function test() {}
                };
                var method = checksMap[route.type];
                if (!method) {
                    _error = 'Error, unknown route type ' + route.type + ': ' + _error;
                    log(_error, 2);
                    throw new Error(_error);
                }

                var _error = method();
                if (_error) {
                    _error = 'Error for route type ' + route.type + ': ' + _error;
                    log(_error, 2);
                    throw new Error(_error);
                }

                // Parse
                console.log('body', req);
                var body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
                var parseMap = {
                    github: function github() {
                        result.name = _.get(body, 'repository.name');
                        result.action = req.headers['x-github-event'];
                        result.branch = _.get(body, 'ref', '').replace('refs/heads/', '') || false;
                    },
                    test: function test() {
                        result = body;
                    }
                };
                parseMap[route.type]();
            }

            return result;
        }
    }, {
        key: '_parsePayload',
        value: function _parsePayload(type, payload) {
            return {
                name: 'pm2-hooks',
                action: 'push',
                branch: 'master'
            };
        }

        /**
         * Checks if the internal server is running.
         *
         * @returns {boolean} True if the server is running
         */

    }, {
        key: 'isRunning',
        value: function isRunning() {
            return !!(this.server && this.server.address());
        }
    }]);

    return WebhookServer;
}();

module.exports = WebhookServer;

function trimSlashes(s) {
    s = s.trim().replace(/(^\/)|(\/$)/, '');
    return s;
}