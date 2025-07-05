import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { version } from './package.json';
const config: ForgeConfig = {  
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{better-sqlite3,get-windows,bindings,prebuild-install,file-uri-to-path,electron-log,electron-squirrel-startup}/**"
    },
    ignore: [
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/\.github/,
      /^\/node_modules\/electron($|\/)/,
      /^\/node_modules\/@electron-forge($|\/)/,
      /^\/node_modules\/@types($|\/)/,
      /^\/node_modules\/typescript($|\/)/,
      /^\/node_modules\/vite($|\/)/,
      /^\/node_modules\/@vitejs($|\/)/,
      /^\/node_modules\/eslint($|\/)/,
      /^\/node_modules\/@typescript-eslint($|\/)/,
      /^\/out/,
      /^\/\.eslintrc/,
      /^\/tsconfig/,
      /^\/vite\./,
      /^\/forge\.config/,
      /^\/README/,
      /^\/scripts/,
      /^\/release-files/
    ],    
    executableName: "Hourglass",
    icon: "./assets/icons/hourglass",
    extraResource: ['assets', 'app-update.yml'],
    // Better app info for searchability
    appBundleId: 'com.hourglass.timetracker',
    appCategoryType: 'public.app-category.productivity',    win32metadata: {
      CompanyName: 'Hourglass Team',
      FileDescription: 'Hourglass Time Tracking Application',
      ProductName: 'Hourglass',
      OriginalFilename: 'Hourglass.exe',
      InternalName: 'Hourglass',
    },
  },
  rebuildConfig: {},  
  makers: [    {
      name: '@electron-forge/maker-squirrel',      config: {
        name: 'hourglass',
        exe: 'Hourglass.exe',
        setupIcon: './assets/icons/hourglass.ico',
        setupExe: 'HourglassSetup.exe',
        title: 'Hourglass',
        authors: 'Hourglass Team',
        owners: 'Hourglass Team',
        description: 'Hourglass Time Tracking Application',
        version: version,
        remoteReleases: false,
        usePackageJson: false,
        // Essential shortcut options
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'Hourglass',
        // Force shortcut creation
        loadingGif: false,
        // Ensure proper installation
        setupMsi: false,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      config: {},
      platforms: ['darwin','win32','linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'UDZO',
        name: 'Hourglass',
        icon: './assets/icons/hourglass.icns',
      },
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: './assets/icons/hourglass.png',
        }
      },
    },    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          icon: './assets/icons/hourglass.png',
        }
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({
      // Only unpack the native modules that actually need it
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
