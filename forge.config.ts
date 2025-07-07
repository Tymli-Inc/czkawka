import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { version } from './package.json';

const config: ForgeConfig = {
  outDir: "build",  // Use different output directory to avoid file locks
  packagerConfig: {
    asar: true,
    executableName: "Hourglass",
    icon: "./assets/icons/hourglass",
    extraResource: ['assets','app-update.yml'],
    // Exclude unnecessary files
    ignore: [
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/\.github/,
      /^\/out/,
      /^\/release-files/,
      /^\/scripts/,
      /^\/\.eslintrc/,
      /^\/tsconfig/,
      /^\/vite\./,
      /^\/forge\.config/,
      /^\/README/,
      // Exclude dev dependencies that shouldn't be packaged
      /node_modules[/\\]electron($|[/\\])/,
      /node_modules[/\\]@electron-forge($|[/\\])/,
      /node_modules[/\\]@types($|[/\\])/,
      /node_modules[/\\]typescript($|[/\\])/,
      /node_modules[/\\]vite($|[/\\])/,
      /node_modules[/\\]@vitejs($|[/\\])/,
      /node_modules[/\\]eslint($|[/\\])/,
      /node_modules[/\\]@typescript-eslint($|[/\\])/,
    ],
    appBundleId: 'com.hourglass.timetracker',
    appCategoryType: 'public.app-category.productivity',    
    win32metadata: {
      CompanyName: 'Hourglass Team',
      FileDescription: 'Hourglass Time Tracking Application',
      ProductName: 'Hourglass',
      OriginalFilename: 'Hourglass.exe',
      InternalName: 'Hourglass',
    },
  },
  rebuildConfig: {},  
  makers: [    
    {
      name: '@electron-forge/maker-squirrel',      
      config: {
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
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'Hourglass',
        loadingGif: false,
        setupMsi: false,
        // Add these for better update handling
        noMsi: true,
        skipUpdateIcon: false,
        certificateFile: undefined,
        certificatePassword: undefined,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      config: {},
      platforms: ['darwin','win32','linux'],
    },
  ],
  plugins: [
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
