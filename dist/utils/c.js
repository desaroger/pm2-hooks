'use strict';

/**
 * Created by desaroger on 23/02/17.
 */

var co = require('co');

var c = co.wrap;
c.run = co;

module.exports = c;