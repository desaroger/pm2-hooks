/**
 * Created by desaroger on 26/02/17.
 */

let childProcess = require('child_process');
let mockSpawn = require('mock-spawn');

let originalSpawn = childProcess.spawn;

module.exports = {
    history: [],
    buildSpawn(fn = false) {
        let mySpawn = mockSpawn();
        if (fn) {
            mySpawn.setStrategy(function (command, args, options) {
                // self.history.push([fn, command, args, options]);
                return fn.call(this, args[0], options, { command, args });
            });
        } else {
            mySpawn.setDefault(mySpawn.simple(1 /* exit code */, 'hello world' /* stdout */));
        }
        return mySpawn;
    },
    start(fn = false) {
        let mySpawn = this.buildSpawn(fn);
        this.mySpawn = mySpawn;
        childProcess.spawn = mySpawn;
    },
    restore() {
        childProcess.spawn = originalSpawn;
    }
    // check() {
    //     this.history.forEach((history) => {
    //         let method = history.shift();
    //         method(...history);
    //     });
    // }
};
