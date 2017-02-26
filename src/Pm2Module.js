/**
 * Created by desaroger on 25/02/17.
 */

let _ = require('lodash');
let childProcess = require('child_process');
let WebhookServer = require('./WebhookServer');

class Pm2Module {

    constructor(processes = [], options = {}) {
        options.routes = Pm2Module._parseProcesses(processes);
        this.webhookServer = new WebhookServer(options);
    }

    start() {
        return this.webhookServer.start();
    }

    stop() {
        return this.webhookServer.stop();
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
    static _parseProcesses(processes) {
        return processes
            .map(p => Pm2Module._parseProcess(p))
            .filter(p => !!p)
            .reduce((routes, app) => {
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
    static _parseProcess(process) {
        // Check data
        if (!process) {
            return null;
        }
        let processOptions = _.get(process, 'pm2_env.env_hook');
        if (!processOptions) {
            return null;
        }
        let data = _.get(process, 'pm2_env.env_hook');

        // Data to WebhookServer route
        let route = {
            name: process.name || 'unknown',
            type: data.type,
            method() {


            }
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
    static _runCommand(command, options = {}) {
        _.defaults(options, {
            env: process.env,
            shell: true
        });
        return new Promise((resolve, reject) => {
            let child = childProcess.spawn('eval', [command], options);
            child.on('close', (code) => {
                if (!code) {
                    resolve();
                } else {
                    reject(code);
                }
            });
        });
    }
}

module.exports = Pm2Module;

function cleanObj(obj) {
    return _(obj).omitBy(_.isUndefined).value();
}
