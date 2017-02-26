'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by desaroger on 23/02/17.
 */

var _ = require('lodash');
var http = require('http');
var bodyParser = require('body-parser');

var _require = require('./utils'),
    log = _require.log;

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
            var _this3 = this;

            bodyParser.urlencoded({
                extended: true
            })(req, res, function () {
                // Mock
                var routeName = _this3._getRouteName(req);
                if (!routeName) {
                    log('No route found on url', 1);
                    res.end(JSON.stringify({
                        status: 'warning',
                        message: 'No route found on url',
                        code: 1
                    }));
                    return;
                }
                var route = _this3.options.routes[routeName];
                if (!route) {
                    log('Warning: Route "' + routeName + '" not found', 1);
                    res.end(JSON.stringify({
                        status: 'warning',
                        message: 'Route "' + routeName + '" not found',
                        code: 1
                    }));
                    return;
                }

                // Prepare the execution of the method
                var payload = _this3._parsePayload(route.type, req.body);
                try {
                    route.method(payload);
                } catch (e) {
                    var message = e;
                    if (message.message) {
                        message = message.message;
                    }
                    log('Error: Route "' + routeName + '" method error: ' + message, 2);
                    res.end(JSON.stringify({
                        status: 'error',
                        message: 'Route "' + routeName + '" method error: ' + message,
                        code: 2
                    }));
                    return;
                }

                log('Success: Route "' + routeName + '" was found', 0);
                res.end(JSON.stringify({
                    status: 'success',
                    message: 'Route "' + routeName + '" was found',
                    code: 0
                }));
            });
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