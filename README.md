# pm2-hooks

PM2 module to listen webhooks from github, bitbucket, gitlab, jenkins and droneci. When a webhook is received you can run a script, pull your project, restart pm2, etc.

This project is highly inspired by [vmarchaud/pm2-githook](https://github.com/vmarchaud/pm2-githook).

Features:

- Runs an http server listening for webhooks
- Works on any repository system, as for now it does nothing with the payload received. In the near future I will check the branch or the action, the secret, etc.
- Only runs the command you set

Wanted features, to be done during Mach/2017:

- Run the command in the cwd defined for the app
- Check payload for secret, check common headers on main git repositories (github, bitbucket, gitlab, etc) to know if is a valid call
- Auto-restart pm2 app after a successful command run (configurable)

Possible features, as I need to think about it:

- Make an automatic `git pull` on the folder, and make a `prePull` and `postPull` available commands (same approach as [vmarchaud/pm2-githook](https://github.com/vmarchaud/pm2-githook))

# Install

```
$ pm2 install pm2-hooks
```

Warning: This library currently (2017 feb 26) is in absolutely ALPHA state. This means some things:

- You can help me making a comment/issue
- I don't recommend you to make a PR for now, as I am actively working on this project
- Probably the `pm2 install pm2-hooks` is not updated, because is based on **npm** and it takes some days to update to last version. If you want to be sure you have the last version you can install it directly from the repository with `pm2 install desaroger/pm2-hooks`


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
				command: 'git pull && npm i && npm test && pm2 restart api-2'
			}
		}
	]
}
```

Where **api-1** has hook disabled and **api-2** is enabled and when the hook is called, the command is executed.

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

Copyright 2016 Roger Fos Soler

Licensed under the [MIT License](/LICENSE).