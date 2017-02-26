/**
 * Created by desaroger on 26/02/17.
 */

let _ = require('lodash');
let r = require('request-promise');
let urlJoin = require('url-join');

module.exports = (path, payload, options = {}) => {
    path = urlJoin('http://localhost:1234', path);
    _.defaults(options, {
        method: 'POST',
        uri: path
    });
    return r(options)
        .then((body) => {
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            return body;
        });
};
