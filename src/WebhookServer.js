/**
 * Created by desaroger on 23/02/17.
 */

const _ = require('lodash');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');
// const ipaddr = require('ipaddr.js');
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
    start() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                return reject('Server previously started');
            }
            this.server = http.createServer(this._handleCall.bind(this));
            this.server.listen(this.options.port, (err) => {
                /* istanbul ignore next */
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
                delete this.server;
                resolve(this);
            });
        });
    }

    /**
     * Parses the body of a request
     *
     * @param {http.IncomingMessage} req The Request of the call
     * @param {http.ServerResponse} res The Response of the call
     * @param {function} fn The function to call after the body has been parsed
     * @private
     */
    _parseBody(req, res, fn) {
        let rawBodyParser = (req2, res2, buf, encoding) => {
            if (buf && buf.length) {
                req2.rawBody = buf.toString(encoding || 'utf8');
                console.log("rawBody", req2.rawBody);
            } else {
                console.log("nope");
            }
        };

        bodyParser.urlencoded({
            extended: true,
            verify: rawBodyParser
        })(req, res, () => {
            bodyParser.json({
                verify: rawBodyParser
            })(req, res, () => {
                bodyParser.raw({
                    type: () => true,
                    verify: rawBodyParser
                })(req, res, fn);
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
        this._parseBody(req, res, c(function* () {
            try {
                // Mock
                let routeName = self._getRouteName(req);
                if (!routeName) {
                    log('No route found on url', 1);
                    res.statusCode = 400;
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
                    res.statusCode = 400;
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
                    res.statusCode = 500;
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
                log(e.message, 2);
                res.statusCode = 500;
                res.end(JSON.stringify({
                    status: 'error',
                    message: `Unexpected error: ${e.message}`,
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

        req.headers = _.transform(req.headers, (result, val, key) => {
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
        let result = {};
        if (route.type) {
            let checksMap = {
                github() {
                    let error = false;
                    if (!req.headers['x-github-event'] || (route.secret && !req.headers['x-hub-signature'])) {
                        error = 'Invalid headers';
                    } else if (route.secret) {
                        if (!req.rawBody) {
                            error = 'Secret required and body not found on request';
                        } else {
                            let hash = crypto.createHmac('sha1', route.secret);
                            hash = hash.update(req.rawBody).digest('hex');
                            if (`sha1=${hash}` !== req.headers['x-hub-signature']) {
                                error = 'Invalid secret';
                            }
                        }
                    }
                    return error;
                },
                bitbucket() {
                    let error = false;
                    let requiredHeaders = ['x-event-key', 'x-request-uuid'];
                    if (requiredHeaders.some(k => !req.headers[k])) {
                        error = 'Invalid headers';
                    } else if (route.secret) {
                        error = 'Secret not supported for bitbucket yet';
                    } else {
                        error = 'Invalid body';
                        if (req.body && _.isObjectLike(req.body)) {
                            let action = req.headers['x-event-key'].replace('repo:', '');
                            if (!action) {
                                error = 'Invalid headers';
                            } else if (req.body[action]) {
                                error = false;
                            }
                        }
                    }
                    return error;
                },
                test() {}
            };
            let method = checksMap[route.type];
            if (!method) {
                let error = `Error unknown route type ${route.type}`;
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
            let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            body = body || {};
            let parseMap = {
                github() {
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
                bitbucket() {
                    result.action = req.headers['x-event-key'].replace('repo:', '');
                    result.name = _.get(body, 'repository.name');
                    result.branch = '<unknown>';
                    let changes = _.get(body, `${result.action}.changes`) || [];
                    let validChange = changes
                        .reduce((total, change) => {
                            total = total.concat([change.old, change.new]);
                            return total;
                        }, [])
                        .filter((change) => {
                            return change && change.type === 'branch';
                        })
                        .find((change) => {
                            return !!change.name;
                        });
                    if (!validChange) {
                        error = `Error for route type ${route.type}: Invalid "changes" key on body`;
                        log(error, 2);
                        throw new Error(error);
                    }
                    result.branch = validChange.name;
                },
                test() {
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
    isRunning() {
        return !!(this.server && this.server.address());
    }

}

module.exports = WebhookServer;

function trimSlashes(s) {
    s = s.trim().replace(/(^\/)|(\/$)/, '');
    return s;
}
