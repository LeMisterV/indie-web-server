#!/usr/bin/env node
const os = require('os')
const fs = require('fs')
const path = require('path')
const ansi = require('ansi-escape-sequences')
const webServer = require('../index.js')

const pm2 = require('pm2')
const childProcess = require('child_process')
const arguments = require('minimist')(process.argv.slice(2), {boolean: true})

const copy = require('copy-concurrently')

const { pathToFileURL } = require('url')

const internalNodeModulesDirectory = path.join(__dirname, '../node_modules')
console.log('internalNodeModulesDirectory', internalNodeModulesDirectory)
const externalNodeModulesDirectory = path.join(os.homedir(), '.indie-web-server/node_modules')
const pm2Path = path.join(externalNodeModulesDirectory, 'pm2/bin/pm2')

if (arguments._.length > 2 || arguments.help === true) {

  const usageFolderToServe = clr('folder-to-serve', 'green')
  const usagePortOption = `${clr('--port', 'yellow')}=${clr('N', 'cyan')}`
  const usageStagingOption = `${clr('--staging', 'yellow')}`
  const usageLiveOption = `${clr('--live', 'yellow')}`
  const usageMonitorOption = `${clr('--monitor', 'yellow')}`
  const usageLogsOption = `${clr('--logs', 'yellow')}`
  const usageInfoOption = `${clr('--info', 'yellow')}`
  const usageOfflineOption = `${clr('--offline', 'yellow')}`
  const usageVersionOption = `${clr('--version', 'yellow')}`

  const usage = `
   ${webServer.version()}
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageFolderToServe}] [${clr('options', 'yellow')}]

  ${usageFolderToServe}\tPath to the folder to serve (defaults to current folder).

  ${clr('Options:', 'underline')}

  ${usagePortOption}\t\tThe port to start the server on (defaults to 443).
  ${usageVersionOption}\t\tDisplay the version and exit.

  ${usageStagingOption}\t\tLaunch server as regular process with globally-trusted certificates.
  ${usageLiveOption}\t\tLaunch server as startup daemon with globally-trusted certificates.

  ${clr('With a running live server, you can also:', 'underline')}

  ${usageMonitorOption}\t\tMonitor the server.
  ${usageLogsOption}\t\tDisplay and tail the server logs.
  ${usageInfoOption}\t\tDisplay detailed information about the server.
  ${usageOfflineOption}\t\tTake the server offline and remove it from startup items.
  `.replace(/\n$/, '').replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

// Version.
if (arguments.version !== undefined) {
  console.log(webServer.version())
  process.exit()
}

// Ensure that we have copied PM2 to a well-known, external location
// so it can be called when Indie Web Server is executed as a standalone
// binary wrapped with nexe.
function ensurePM2 (callback) {
  if (!fs.existsSync(externalNodeModulesDirectory)) {
    copy(internalNodeModulesDirectory, externalNodeModulesDirectory).then((error, results) => {
      console.log(' 💅 External node modules ready.')
      callback()
    }).catch (error => {
      console.log('\n 🔥 Error: could not copy node modules', error)
      throw error
    })
  } else {
    console.log(' 💅 External node modules ready.')
    callback()
  }
}

// Monitor (pm2 proxy).
if (arguments.monitor !== undefined) {
  ensurePM2(() => {
    const options = {
      env: process.env,
      stdio: 'inherit'  // Display output.
    }
    // Launch pm2 monit.
    try {
      childProcess.execSync(`sudo ${pm2Path} monit`, options)
    } catch (error) {
      console.log(`\n 👿 Failed to launch the process monitor.\n`)
      process.exit(1)
    }
    process.exit(0)
  })
}

// Logs (pm2 proxy).
if (arguments.logs !== undefined) {
  ensurePM2(() => {
    const options = {
      env: process.env,
      stdio: 'inherit'  // Display output.
    }
    // Launch pm2 logs.
    try {
      childProcess.execSync(`sudo ${pm2Path} logs web-server`, options)
    } catch (error) {
      console.log(`\n 👿 Failed to get the logs.\n`)
      process.exit(1)
    }
    process.exit(0)
  })
}

// Info (pm2 proxy).
if (arguments.info !== undefined) {
  ensurePM2(() => {
    const options = {
      env: process.env,
      stdio: 'inherit'  // Display output.
    }
    // Launch pm2 logs.
    try {
      childProcess.execSync(`sudo ${pm2Path} show web-server`, options)
    } catch (error) {
      console.log(`\n 👿 Failed to show detailed information on the web server.\n`)
      process.exit(1)
    }
    process.exit(0)
  })
}

// Offline (pm2 proxy for unstartup + delete)
if (arguments.offline !== undefined) {
  ensurePM2(() => {
    const options = {
      env: process.env,
      stdio: 'pipe'   // Suppress output.
    }

    // Do some cleanup, display a success message and exit.
    function success () {
      // Try to reset permissions on pm2 so that future uses of pm2 proxies via web-server
      // in this session will not require sudo.
      try {
        childProcess.execSync('sudo chown $(whoami):$(whoami) /home/$(whoami)/.pm2/rpc.sock /home/$(whoami)/.pm2/pub.sock', options)
      } catch (error) {
        console.log(`\n 👿 Warning: could not reset permissions on pm2.`)
      }

      // All’s good.
      console.log(`\n 😈 Server is offline and removed from startup items.\n`)
      process.exit(0)
    }

    // Is the server running?
    try {
      childProcess.execSync(`sudo ${pm2Path} show web-server`, options)
    } catch (error) {
      console.log(`\n 👿 Server is not running as a live daemon; nothing to take offline.\n`)
      process.exit(1)
    }

    // Try to remove from startup items.
    try {
      childProcess.execSync(`sudo ${pm2Path} unstartup`, options)
    } catch (error) {
      console.log(`\n 👿 Could not remove the server from startup items.\n`)
      process.exit(1)
    }

    // If the server was started as a startup item, unstartup will also
    // kill the process. Check again to see if the server is running.
    try {
      childProcess.execSync(`sudo ${pm2Path} show web-server`, options)
    } catch (error) {
      success()
    }

    // The server is still on (it was not started as a startup item). Use
    // pm2 delete to remove it.
    try {
      childProcess.execSync(`sudo ${pm2Path} delete web-server`, options)
    } catch (error) {
      console.log(`\n 👿 Could not delete the server daemon.\n`)
      process.exit(1)
    }

    success()
  })
}

// If no path is passed, serve the current folder.
// If there is a path, serve that.
let pathToServe = '.'
if (arguments._.length > 0) {
  pathToServe = arguments._[0]
}

// If a port is specified, use it. Otherwise use the default port (443).
let port = 443
if (arguments.port !== undefined) {
  port = parseInt(arguments.port)
}

// If staging is specified, use it.
let global = false
if (arguments.staging !== undefined) {
  global = true
}

if (!fs.existsSync(pathToServe)) {
  console.log(` 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// If live mode is specified, run as a daemon using the pm2 process manager.
// Otherwise, start it as a regular process.
if (arguments.live !== undefined) {
  ensurePM2(() => {
    pm2.connect((error) => {
      if (error) {
        console.log(error)
        process.exit(1)
      }

      pm2.start({
        script: path.join(__dirname, 'daemon.js'),
        args: pathToServe,
        name: 'web-server',
        autorestart: true
      }, (error, processObj) => {
        if (error) {
          throw error
        }

        console.log(`${webServer.version()}\n 😈 Launched as daemon on https://${os.hostname()}\n`)

        //
        // Run the script that tells the process manager to add the server to launch at startup
        // as a separate process with sudo privileges.
        //
        const options = {
          env: process.env,
          stdio: 'pipe'     // Suppress output.
        }

        try {
          const output = childProcess.execSync(`sudo ${pm2Path} startup`, options)
        } catch (error) {
          console.log(` 👿 Failed to add server for auto-launch at startup.\n`)
          console.log(error)
          pm2.disconnect()
          process.exit(1)
        }

        console.log(` 😈 Installed for auto-launch at startup.\n`)

        // Disconnect from the pm2 daemon. This will also exit the script.
        pm2.disconnect()
      })
    })
  })
} else {
  //
  // Start a regular server process.
  //
  webServer.serve({
    path: pathToServe,
    port,
    global
  })
}

//
// Helpers.
//

// Format ansi strings.
// Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
