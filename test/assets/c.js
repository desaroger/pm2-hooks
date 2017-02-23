/**
 * Created by desaroger on 23/02/17.
 */

let co = require('co');

let c = co.wrap;
c.run = co;

module.exports = c;
