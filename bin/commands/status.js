//////////////////////////////////////////////////////////////////////
//
// Command: status
//
// Displays the web server daemon status.
//
// Proxies: systemctl status web-server
//
//////////////////////////////////////////////////////////////////////

const getStatus = require('../lib/status')
const clr = require('../../lib/clr')
const ensure = require('../lib/ensure')

function status () {
  // Ensure systemctl exists as it is required for getStatus().
  // We cannot check in the function itself as it would create
  // a circular dependency.
  ensure.systemctl()
  const { isActive, isEnabled } = getStatus()

  const activeState = isActive ? clr('active', 'green') : clr('inactive', 'red')
  const enabledState = isEnabled ? clr('enabled', 'green') : clr('disabled', 'red')

  const stateEmoji = (isActive && isEnabled) ? '✔' : '❌'

  console.log(`\n ${stateEmoji} Indie Web Server is ${activeState} and ${enabledState}.\n`)
}

module.exports = status
