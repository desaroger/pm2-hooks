/**
 * Created by desaroger on 21/02/17.
 */

let spawn = require('child_process').spawn;

let child = spawn('echo lol', ['hola']);

child.stdin.pipe(process.stdin);
child.stdout.pipe(process.stdout);
