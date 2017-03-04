/**
 * Created by desaroger on 4/03/17.
 */

module.exports = function isPromise(x) {
    if (!x || typeof x !== 'object') return false;
    if (typeof x.then !== 'function' || typeof x.catch !== 'function') return false;
    return true;
};
