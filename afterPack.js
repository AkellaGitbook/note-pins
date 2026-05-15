const path = require('path')
const { execFileSync } = require('child_process')
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

/**
 * afterPack hook: embed custom icon + enable RunAsNode fuse.
 *
 * The RunAsNode fuse is disabled by default in Electron 28+. Re-enabling it
 * allows Claude Desktop to spawn Note Pins.exe with ELECTRON_RUN_AS_NODE=1
 * to run the MCP server script via stdio transport.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const rcedit = path.join(__dirname, 'node_modules', 'rcedit', 'bin', 'rcedit.exe')
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const ico = path.join(__dirname, 'resources', 'icon.ico')

  execFileSync(rcedit, [exe, '--set-icon', ico])

  await flipFuses(exe, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: true,
  })
}
