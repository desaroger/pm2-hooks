/**
 * Created by desaroger on 21/02/17.
 */

const spawn = require('child_process').spawn;

const child = spawn('echo lol', ['hola']);

child.stdin.pipe(process.stdin);
child.stdout.pipe(process.stdout);
