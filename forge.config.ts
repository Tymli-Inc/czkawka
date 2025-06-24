import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "node_modules/**"
    },
    ignore: [
      "!node_modules/better-sqlite3",
      "!node_modules/get-windows", 
      "!node_modules/bindings",
      "!node_modules/prebuild-install",
      "!node_modules/file-uri-to-path",
      "!node_modules/node-addon-api",
      "!node_modules/@mapbox",
      "!node_modules/node-pre-gyp"
    ],
    executableName: "hourglass",
    icon: "assets/icons/hourglass",
    extraResource: ['assets'],
  },
  rebuildConfig: {},
    makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Hourglass',
        setupIcon: 'assets/icons/hourglass.ico',
        shortcutName: 'Hourglass',
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutFolderName: 'Hourglass'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      config: {},
      platforms: ['darwin','win32','linux'],
    },    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'UDZO',
        name: 'Hourglass',
        icon: 'assets/icons/hourglass.icns',
      },
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'assets/icons/hourglass.png',
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          icon: 'assets/icons/hourglass.png',
        }
      },
    },  ],
  plugins: [    
    new AutoUnpackNativesPlugin({
      packagedModules: ['better-sqlite3', 'get-windows', 'bindings', 'prebuild-install', 'file-uri-to-path', 'electron-log', 'electron-squirrel-startup']
    }),
    new VitePlugin({
      build: [
        {
          entry: 'src/electron/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/electron/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
