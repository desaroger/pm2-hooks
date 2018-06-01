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
// const ipaddr = require('ipaddr.js');

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
            /* istanbul ignore next */
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
                if (_this.server) {
                    return reject('Server previously started');
                }
                _this.server = http.createServer(_this._handleCall.bind(_this));
                _this.server.listen(_this.options.port, function (err) {
                    /* istanbul ignore next */
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
                    delete _this2.server;
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
            })(req, res, c( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                var routeName, route, payload, result, message;
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
                                _context.next = 35;
                                break;

                            case 31:
                                _context.prev = 31;
                                _context.t1 = _context['catch'](0);

                                log(_context.t1.message, 2);
                                res.end(JSON.stringify({
                                    status: 'error',
                                    message: 'Unexpected error: ' + _context.t1.message,
                                    code: 2
                                }));

                            case 35:
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

            req.headers = _.transform(req.headers, function (result, val, key) {
                result[key.toLowerCase()] = val;
            });

            // Auto-type
            if (route.type === 'auto') {
                if (req.headers['x-github-event']) {
                    route.type = 'github';
                } else if (req.headers['user-agent'] && /bitbucket/i.test(req.headers['user-agent'])) {
                    route.type = 'bitbucket';
                }
                if (route.type === 'auto') {
                    route.type = false;
                }
            }

            // Checks
            var result = {};
            if (route.type) {
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
                    bitbucket: function bitbucket() {
                        var error = false;
                        var requiredHeaders = ['x-event-key', 'x-request-uuid'];
                        if (requiredHeaders.some(function (k) {
                            return !req.headers[k];
                        })) {
                            error = 'Invalid headers';
                        } else if (route.secret) {
                            error = 'Secret not supported for bitbucket yet';
                        } else {
                            error = 'Invalid body';
                            if (req.body && _.isObjectLike(req.body)) {
                                var action = req.headers['x-event-key'].replace('repo:', '');
                                if (!action) {
                                    error = 'Invalid headers';
                                } else if (req.body[action]) {
                                    error = false;
                                }
                            }
                        }
                        return error;
                    },
                    test: function test() {}
                };
                var method = checksMap[route.type];
                if (!method) {
                    var _error = 'Error unknown route type ' + route.type;
                    log(_error, 2);
                    throw new Error(_error);
                }

                var error = method();
                if (error) {
                    error = 'Error for route type ' + route.type + ': ' + error;
                    log(error, 2);
                    throw new Error(error);
                }

                // Parse
                var body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
                body = body || {};
                var parseMap = {
                    github: function github() {
                        if (body.payload) {
                            body = body.payload;
                        }
                        if (typeof body === 'string') {
                            body = JSON.parse(body);
                        }
                        result.name = _.get(body, 'repository.name');
                        result.action = req.headers['x-github-event'];
                        result.branch = _.get(body, 'ref', '').replace('refs/heads/', '') || false;
                    },
                    bitbucket: function bitbucket() {
                        result.action = req.headers['x-event-key'].replace('repo:', '');
                        result.name = _.get(body, 'repository.name');
                        result.branch = '<unknown>';
                        var changes = _.get(body, result.action + '.changes') || [];
                        var validChange = changes.reduce(function (total, change) {
                            total = total.concat([change.old, change.new]);
                            return total;
                        }, []).filter(function (change) {
                            return change && change.type === 'branch';
                        }).find(function (change) {
                            return !!change.name;
                        });
                        if (!validChange) {
                            error = 'Error for route type ' + route.type + ': Invalid "changes" key on body';
                            log(error, 2);
                            throw new Error(error);
                        }
                        result.branch = validChange.name;
                    },
                    test: function test() {
                        result = body;
                    }
                };
                parseMap[route.type]();
            }

            return result;
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