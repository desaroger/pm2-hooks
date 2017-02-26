/**
 * Created by desaroger on 23/02/17.
 */

const _ = require('lodash');
const http = require('http');
const bodyParser = require('body-parser');

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
        bodyParser.urlencoded({
            extended: true
        })(req, res, () => {
            // Mock
            let routeName = this._getRouteName(req);
            let route = this.options.routes[routeName];
            if (!route) {
                res.end(JSON.stringify({
                    status: 'warning',
                    message: `Route "${routeName}" not found`,
                    code: 1
                }));
                return;
            }

            // Prepare the execution of the method
            let payload = this._parsePayload(route.type, req.body);
            try {
                route.method(payload);
            } catch (e) {
                let message = e;
                if (message.message) {
                    message = message.message;
                }
                res.end(JSON.stringify({
                    status: 'error',
                    message: `Route method error: ${message}`,
                    code: 2
                }));
                return;
            }

            res.end(JSON.stringify({
                status: 'success',
                message: `Route "${routeName}" was found`,
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
    _getRouteName(req) {
        let path = trimSlashes(req.url);
        let name = path.split('/')[0];
        name = name.split('?')[0];
        if (!name) {
            return null;
        }

        return name;
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
