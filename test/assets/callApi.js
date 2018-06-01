/**
 * Created by desaroger on 26/02/17.
 */

let _ = require('lodash');
let r = require('request-promise');
let urlJoin = require('url-join');
// let expect = require('./expect');

module.exports = (path, payload = false, options = {}) => {
    path = urlJoin('http://localhost:1234', path || '/');
    _.defaults(options, {
        method: 'POST',
        uri: path,
        status: false,
        form: payload
    });
    // if (payload) {
    //     options.form = payload;
    // }
    // if (options.status) {
    //     options.resolveWithFullResponse = true;
    // }
    return r(options)
        .then((body) => {
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            return body;
        });
};
