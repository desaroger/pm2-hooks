'use strict';

/**
 * Created by desaroger on 21/02/17.
 */

var pmx = require('pmx');
var pm2 = require('pm2');
var Pm2Module = require('./Pm2Module');
require('babel-regenerator-runtime');

pmx.initModule({}, function (errPMX, conf) {
    pm2.connect(function (errPM2) {
        if (errPMX || errPM2) {
            console.error(errPMX || errPM2); // eslint-disable-line no-console
            return;
        }
        pm2.list(function (err, apps) {
            var pm2Module = new Pm2Module(apps, conf);
            pm2Module.start();
        });
    });
});