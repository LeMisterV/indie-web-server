////////////////////////////////////////////////////////////////////////////////
//
// When run as a regular Node script, the source directory is our parent
// directory (web-server.js resides in the <sourceDirectory>/bin directory).
// However, when run as a standalone executable using Nexe, we currently have
// to bundle the source code in the executable and copy it from the virtual
// filesystem of the binary to the external file system in order to run the
// pm2 process manager using execSync.
//
// For more information, please see the following issues in the Nexe repo:
//
// https://github.com/nexe/nexe/issues/605
// https://github.com/nexe/nexe/issues/607
//
////////////////////////////////////////////////////////////////////////////////

module.exports = {
  isNode: process.argv0 === 'node',
  isBinary: process.argv0 === 'web-server'
}
