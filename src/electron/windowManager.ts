import path from 'path';
import { BrowserWindow, Tray, Menu } from 'electron';
import { getTrayIconPath } from './utils';
import log from 'electron-log';

// Log when windowManager module is loaded
log.info('windowManager module loaded');

// Declare constants for Vite dev server URL and name
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

interface AppExtended {
  isQuiting: boolean;
}

export function createMainWindow(app: AppExtended, shouldStartHidden: boolean = false): { window: BrowserWindow, tray: Tray } {
  log.info('createMainWindow called, shouldStartHidden:', shouldStartHidden);
  
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    frame: false, // Remove the default window frame
    titleBarStyle: 'hidden', // Hide the title bar
    show: false, // Never show window initially
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    minHeight: 850,
    minWidth: 1500,
  });

  log.info('Main window created with bounds', mainWindow.getBounds());

  // Remove the default menu bar
  log.info('Hiding default menu bar');
  mainWindow.setMenuBarVisibility(false);

  // In development, use the Vite dev server
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    log.info('Loading dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    log.info('Loading production index.html');
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Only show window after content is loaded and if not starting hidden
  mainWindow.once('ready-to-show', () => {
    if (!shouldStartHidden) {
      mainWindow.show();
      log.info('Window shown after ready-to-show');
    } else {
      mainWindow.setSkipTaskbar(true);
      log.info('Window kept hidden and removed from taskbar');
    }
  });

  if (!require('electron').app.isPackaged) {
    log.info('Opening DevTools');
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('close', (event) => {
    log.info('Main window close event');
    if (!app.isQuiting) {
      event.preventDefault();
      log.info('Prevented default close, hiding window');
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  });

  // Listen for maximize/unmaximize events to keep UI in sync
  mainWindow.on('maximize', () => {
    log.info('Main window maximized');
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    log.info('Main window unmaximized');
    mainWindow.webContents.send('window-maximized', false);
  });

  const tray = createTray(mainWindow, app);
  log.info('Tray created');

  return { window: mainWindow, tray };
}

function createTray(mainWindow: BrowserWindow, app: AppExtended): Tray {
  log.info('createTray called');
  const tray = new Tray(getTrayIconPath());
  log.info('Tray icon set to path:', getTrayIconPath());
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        mainWindow.setSkipTaskbar(false);
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        require('electron').app.quit();
      },
    },
  ]);
  log.info('Tray context menu built');
  
  tray.setToolTip('Hourglass');
  log.info('Tray tooltip set');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    log.info('Tray click event');
    mainWindow.show();
    mainWindow.setSkipTaskbar(false);
  });

  return tray;
}