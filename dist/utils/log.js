'use strict';

/**
 * Created by desaroger on 26/02/17.
 */

function log(msg) {
    var status = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    log.count++;
    msg = '[' + log.getDate() + '] ' + msg;
    if (log.mocks.length) {
        var method = log.mocks.shift();
        log.history.push({ method: method, msg: msg, status: status });
        // return method.call(log, msg, status);
    } else {
        return log.defaultMethod(msg, status);
    }
}

log.count = 0;
log.history = [];

log.getDate = function build() {
    return new Date().toISOString();
};

log.mocks = [];

log.defaultMethod = function defaultMethod(msg) {
    var status = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    // if (process.env.NODE_ENV === 'test') {
    //     // return;
    // }
    var map = {
        0: 'log',
        1: 'warn',
        2: 'error'
    };
    console[map[status]](msg);
};

log.mock = function mock() {
    var fn = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

    log.mocks.push(fn);
    log.mockedMethod = fn;
};

log.restore = function restore() {
    log.count = 0;
    log.mockedOnce = false;
    log.mockedMethod = false;
    log.mocks = [];
    log.history = [];
};

log.checkMocks = function checkMocks() {
    this.history.forEach(function (_ref) {
        var method = _ref.method,
            msg = _ref.msg,
            status = _ref.status;

        method(msg, status);
    });
};

module.exports = log;