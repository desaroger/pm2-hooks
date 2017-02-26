/**
 * Created by desaroger on 23/02/17.
 */

let assets = require('../../src/utils');
Object.assign(assets, require('require-dir')());

module.exports = assets;
