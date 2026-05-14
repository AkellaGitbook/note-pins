import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.notepins.app',
  productName: 'Note Pins',
  afterPack: `${process.cwd()}/afterPack.js`,
  directories: {
    buildResources: 'resources',
    output: 'dist',
  },
  files: ['out/**/*', '!out/renderer/**/*.map'],
  extraResources: [
    { from: 'mcp-server/dist', to: 'mcp-server/dist', filter: ['**/*.js'] },
    { from: 'mcp-server/node_modules', to: 'mcp-server/node_modules' },
  ],
  extraMetadata: {
    main: 'out/main/index.js',
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.ico',
    signingHashAlgorithms: [],
    sign: null,
  },
  mac: {
    target: 'dmg',
    icon: 'resources/icon.icns',
  },
  linux: {
    target: 'AppImage',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    artifactName: '${productName} Setup ${version}.${ext}',
  },
}

export default config
