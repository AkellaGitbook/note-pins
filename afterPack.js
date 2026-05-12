const path = require('path')
const { execFileSync } = require('child_process')

/**
 * afterPack hook: embed the custom icon into Note Pins.exe via rcedit.
 *
 * electron-builder's built-in rcedit call (inside app-builder.exe) silently
 * fails on this project. Calling the npm rcedit binary from Node.js works
 * reliably because Node handles argument quoting correctly.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const rcedit = path.join(__dirname, 'node_modules', 'rcedit', 'bin', 'rcedit.exe')
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const ico = path.join(__dirname, 'resources', 'icon.ico')

  execFileSync(rcedit, [exe, '--set-icon', ico])
}
