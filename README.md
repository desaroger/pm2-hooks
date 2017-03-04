# pm2-hooks

[![GitHub version][fury-badge]][fury-url]
[![Travis-CI][travis-badge]][travis-url]
[![Codeclimate][codeclimate-badge]][codeclimate-url]
[![Codeclimate Coverage][codeclimate-cov-badge]][codeclimate-cov-url]
[![Dependency][david-badge]][david-url]
[![DevDependency][david-dev-badge]][david-dev-url]

PM2 module to listen webhooks from github, bitbucket, gitlab, jenkins and droneci. When a webhook is received you can run a script, pull your project, restart pm2, etc.

This project is highly inspired by [vmarchaud/pm2-githook](https://github.com/vmarchaud/pm2-githook).

Features ([changelog](/CHANGELOG.md)):

- Runs an http server listening for webhooks
- Works on any repository system, as for now it does nothing with the payload received. In the near future I will check the branch or the action, the secret, etc.
- Only runs the command you set
- Run the command in the cwd defined for the app

Wanted features, to be done during Mach/2017:

- Check payload for secret, check common headers on main git repositories (github, bitbucket, gitlab, etc) to know if is a valid call

Possible features, as I need to think about it:

- Auto-restart pm2 app after a successful command run
- Make an automatic `git pull` on the folder, and make a `prePull` and `postPull` available commands (same approach as [vmarchaud/pm2-githook](https://github.com/vmarchaud/pm2-githook))

# Install

To install it simply run:

```bash
$ pm2 install pm2-hooks
```

Warning: This library currently (2017 feb 26) is in ALPHA state. This means some things:

- You can help me a lot making a comment/issue
- I don't recommend you to make a PR for now, as I am actively working on this project
- I will try to publish the last version to npm so you can install it with only `pm2 install pm2-hooks`. If for some reason the version on npm is outdated you always will be capable of run `pm2 install desaroger/pm2-hooks` to be sure to install the last version directly from the repository.


# Usage

## Step 1: Prepare the ecosystem file

By default **pm2-hooks** doesn't do anything. You need to set the key `env_hooks` inside the config of a given app, inside the ecosystem file.

If env_hooks isn't defined or is falsy then is disabled.

Example of an ecosystem file:

```js
{
	apps: [
		{
			name: 'api-1',
			script: 'server.js'
		},
		{
			name: 'api-2',
			script: 'server.js',
			env_hooks: {
				command: 'git pull && npm i && npm test && pm2 restart api-2',
				cwd: '/home/desaroger'
			}
		}
	]
}
```

Where **api-1** has hook disabled and **api-2** is enabled and when the hook is called, the command is executed.

### Available options:

- **command** *{string}* The line you want to execute. Will be executed with NodeJS `spawn`. (optional, but if not set this is not going to do nothing ¯\\_(ツ)_/¯)
- **cwd** *{string}* The cwd to use when running the command. If not set, the one used on your ecosystem app configuration will be used (if set).
- **commandOptions** *{object}* The object that we will pass to the NodeJS `spawn`. Defaults to a blank object, and later we add the *cwd*.
- **type** *{string}* [not implemented yet] The git server you are going to use [github, gitlab, bitbucket, etc].

## Step 2: Install

If you didn't install before, install it. If you installed it, then you will need to restart it. For that, run `pm2 restart pm2-hooks`.

## Step 3: Try it

Now you have a server on port 9000 by default. You can make a call to `http://localhost:9000/api-2` to see the response.

If everything went fine, you will see:

```js
{
	status: 'success',
	message: 'Route "api-2" was found'
	code: 0
}
```

And the command had been executed.

## Step 4: See the log

Everything will be logged in the pm2 logs. For see them, run:

```bash
$ pm2 logs pm2-hooks
```

And for see the entire log:

```bash
$ cat ~/.pm2/logs/pm2-hooks-out-0.log
```

# FAQ

## How I can change the port?

You can set the port (where the default port is 9000) setting it in the config of the pm2 module. For doing that, run:

```bash
$ pm2 set pm2-hooks:port 3000
```

## How I can uninstall it?

You can uninstall this module running:

```bash
$ pm2 uninstall pm2-hooks
```

# Another similar projects

These are some projects I found similar to mine. Please let me know if you know anoher.

- [vmarchaud/pm2-githook](https://github.com/vmarchaud/pm2-githook): From where I was inspired. It works on any repository, pulls the repo when webhook is called and has *preHook* and *postHook* commands available.
- [oowl/pm2-webhook](https://github.com/oowl/pm2-webhook): Works on any repository. If you want to use the *secret*, then the webhook must contain the *X-Hub-Signature* in order to work (I don't know if every git server contains it).

# Copyright and license

Copyright 2017 Roger Fos Soler

Licensed under the [MIT License](/LICENSE).


[npm-badge]: https://img.shields.io/npm/v/pm2-hooks.svg
[npm-url]: https://www.npmjs.com/package/pm2-hooks

[fury-badge]: https://badge.fury.io/js/pm2-hooks.svg
[fury-url]: https://www.npmjs.com/package/pm2-hooks

[travis-badge]: https://travis-ci.org/desaroger/pm2-hooks.svg
[travis-url]: https://travis-ci.org/desaroger/pm2-hooks

[david-badge]: https://david-dm.org/desaroger/pm2-hooks.svg
[david-url]: https://david-dm.org/desaroger/pm2-hooks
[david-dev-badge]: https://david-dm.org/desaroger/pm2-hooks/dev-status.svg
[david-dev-url]: https://david-dm.org/desaroger/pm2-hooks#info=devDependencies

[gemnasium-badge]: https://gemnasium.com/badges/github.com/desaroger/pm2-hooks.svg
[gemnasium-url]: https://gemnasium.com/github.com/desaroger/pm2-hooks

[codeclimate-badge]: https://codeclimate.com/github/desaroger/pm2-hooks/badges/gpa.svg
[codeclimate-url]: https://codeclimate.com/github/desaroger/pm2-hooks

[codeclimate-cov-badge]: https://codeclimate.com/github/desaroger/pm2-hooks/badges/coverage.svg?hash=1
[codeclimate-cov-url]: https://codeclimate.com/github/desaroger/pm2-hooks/coverage

[coverage-badge]: https://codeclimate.com/github/desaroger/pm2-hooks/badges/coverage.svg
[coverage-url]: https://codeclimate.com/github/desaroger/pm2-hooks/coverage
