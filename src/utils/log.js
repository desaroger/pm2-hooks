/**
 * Created by desaroger on 26/02/17.
 */

function log(msg, status = 0) {
    log.count++;
    msg = `[${log.getDate()}] ${msg}`;
    if (log.mocks.length) {
        let method = log.mocks.shift();
        return method.call(log, msg, status);
    } else {
        return log.defaultMethod(msg, status);
    }
}

log.count = 0;

log.getDate = function build() {
    return new Date().toISOString();
};

log.mocks = [];

log.defaultMethod = function defaultMethod(msg, status = 0) {
    // if (process.env.NODE_ENV === 'test') {
    //     // return;
    // }
    let map = {
        0: 'log',
        1: 'warn',
        2: 'error'
    };
    console[map[status]](msg);
};

log.mock = function mock(fn) {
    log.mocks.push(fn);
    log.mockedMethod = fn;
};

log.restore = function restore() {
    log.count = 0;
    log.mockedOnce = false;
    log.mockedMethod = false;
    log.mocks = [];
};

module.exports = log;
