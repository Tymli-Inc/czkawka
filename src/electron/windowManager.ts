import path from 'path';
import { BrowserWindow, Tray, Menu } from 'electron';
import { getTrayIconPath } from './utils';

// Declare constants for Vite dev server URL and name
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

interface AppExtended {
  isQuiting: boolean;
}

export function createMainWindow(app: AppExtended): { window: BrowserWindow, tray: Tray } {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, use the Vite dev server
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  if (!require('electron').app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  });

  const tray = createTray(mainWindow, app);

  return { window: mainWindow, tray };
}

function createTray(mainWindow: BrowserWindow, app: AppExtended): Tray {
  const tray = new Tray(getTrayIconPath());
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
  
  tray.setToolTip('Hourglass');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
    mainWindow.setSkipTaskbar(false);
  });

  return tray;
}