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

            console.log('');
            console.log('');
            console.log('>>>>>');
            apps.forEach(function (app) {
                console.log('name', app.name);
                console.log('cwd', app.pm2_env.pm_cwd);
                console.log('webhook', app.pm2_env.env_hook);
            });
            console.log('fin');
            // console.log('');
            // console.log('//////////2');
            // apps.forEach((app) => {
            //     delete app.env;
            //     console.log('app', app);
            // });
        });
    });
});