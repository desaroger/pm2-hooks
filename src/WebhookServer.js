/**
 * Created by desaroger on 23/02/17.
 */

const _ = require('lodash');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { log, c, isPromise } = require('./utils');

class WebhookServer {

    /**
     * @param {object} options The options
     * @constructor
     */
    constructor(options = {}) {
        _.defaults(options, {
            port: process.env.PORT || 9000,
            routes: {}
        });
        for (let name in options.routes) {
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
    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(this._handleCall.bind(this));
            this.server.listen(this.options.port, (err) => {
                if (err) return reject(err);
                resolve(this);
            });
        });
    }

    /**
     * Stops the server. Doesn't throws an error if fails.
     *
     * @returns {Promise<WebhookServer>} Returns the instance
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.server) {
                return resolve(this);
            }
            this.server.close(() => {
                resolve(this);
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
    _handleCall(req, res) {
        let self = this;
        bodyParser.urlencoded({
            extended: true
        })(req, res, c(function* () {
            try {
                // Mock
                let routeName = self._getRouteName(req);
                if (!routeName) {
                    log('No route found on url', 1);
                    res.end(JSON.stringify({
                        status: 'warning',
                        message: 'No route found on url',
                        code: 1
                    }));
                    return;
                }
                let route = self.options.routes[routeName];
                if (!route) {
                    log(`Warning: Route "${routeName}" not found`, 1);
                    res.end(JSON.stringify({
                        status: 'warning',
                        message: `Route "${routeName}" not found`,
                        code: 1
                    }));
                    return;
                }

                // Prepare the execution of the method
                let payload = self._parseRequest(req, route);
                let result;
                try {
                    result = route.method(payload);
                    if (isPromise(result)) {
                        result = yield result;
                    }
                } catch (e) {
                    let message = e.message ? e.message : e;
                    log(`Error: Route "${routeName}" method error: ${message}`, 2);
                    res.end(JSON.stringify({
                        status: 'error',
                        message: `Route "${routeName}" method error: ${message}`,
                        code: 2
                    }));
                    return;
                }

                log(`Success: Route "${routeName}" was found`, 0);
                res.end(JSON.stringify({
                    status: 'success',
                    message: `Route "${routeName}" was found`,
                    code: 0,
                    result
                }));
            } catch (e) {
                let msg = e.message ? e.message : e;
                log(msg, 2);
                res.end(JSON.stringify({
                    status: 'error',
                    message: `Unexpected error: ${msg}`,
                    code: 2
                }));
            }
        }));
    }

    /**
     * Given a request, returns the matched route
     *
     * @param {http.IncomingMessage} req The Request of the call
     * @returns {string|null} The matched route or null if not
     * @private
     */
    _getRouteName(req) {
        let path = trimSlashes(req.url);
        let name = path.split('/')[0];
        name = name.split('?')[0];
        if (!name) {
            return null;
        }

        return name;
    }

    _parseRequest(req, route) {
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

        let result = {};
        if (route.type) {
            // Checks
            let checksMap = {
                github() {
                    let error = false;
                    if (!req.headers['x-github-event'] || !req.headers['x-hub-signature']) {
                        error = 'Invalid headers';
                    } else if (route.secret) {
                        let hash = crypto.createHmac('sha1', route.secret);
                        hash = hash.update(req.body).digest('hex');
                        if (`sha1=${hash}` !== req.headers['x-hub-signature']) {
                            error = 'Invalid secret';
                        }
                    }
                    return error;
                },
                test() {}
            };
            let method = checksMap[route.type];
            if (!method) {
                error = `Error, unknown route type ${route.type}: ${error}`;
                log(error, 2);
                throw new Error(error);
            }

            let error = method();
            if (error) {
                error = `Error for route type ${route.type}: ${error}`;
                log(error, 2);
                throw new Error(error);
            }

            // Parse
            console.log('body', req);
            let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            let parseMap = {
                github() {
                    result.name = _.get(body, 'repository.name');
                    result.action = req.headers['x-github-event'];
                    result.branch = _.get(body, 'ref', '').replace('refs/heads/', '') || false;
                },
                test() {
                    result = body;
                }
            };
            parseMap[route.type]();
        }

        return result;
    }

    _parsePayload(type, payload) {
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
    isRunning() {
        return !!(this.server && this.server.address());
    }

}

module.exports = WebhookServer;

function trimSlashes(s) {
    s = s.trim().replace(/(^\/)|(\/$)/, '');
    return s;
}
