/**
 * Created by desaroger on 26/02/17.
 */

function log(msg, status = 0) {
    log.count++;
    msg = `[${log.getDate()}] ${msg}`;
    if (log.mocks.length) {
        let mock = log.mocks.shift();
        if (mock.options.checkNow) {
            mock.method(msg, status);
        } else {
            log.history.push({ method: mock.method, msg, status });
        }
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

log.mock = function mock(method = () => {}, options = {}) {
    log.mocks.push({ method, options });
    log.mockedMethod = method;
};

log.restore = function restore() {
    log.count = 0;
    log.mockedOnce = false;
    log.mockedMethod = false;
    log.mocks = [];
    log.history = [];
};

log.checkMocks = function checkMocks() {
    this.history.forEach(({ method, msg, status }) => {
        method(msg, status);
    });
};

module.exports = log;
