import { app as appBase, BrowserWindow, Tray } from 'electron';
import { initializeDatabase } from './database';
import { initializeWindowTracking } from './windowTracking';
import { setupProtocolHandling, setupDeepLinkHandlers } from './auth';
import { ensureSingleInstance, getTrayIconPath } from './utils';
import { createMainWindow } from './windowManager';
import { setupIpcHandlers } from './ipcHandlers';
import log from 'electron-log';

import './auth';

interface AppExtended extends Electron.App {
    isQuiting: boolean;
}

const app = appBase as AppExtended;
app.isQuiting = false;

app.setName('Hourglass');

export let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

if (!ensureSingleInstance()) {
    process.exit(0);
}

setupProtocolHandling();

app.whenReady().then(() => {
    try {
        const dbInitialized = initializeDatabase();
        if (!dbInitialized) {
            log.error('Failed to initialize database');
        }

        const { window, tray: appTray } = createMainWindow(app);
        mainWindow = window;
        tray = appTray;
        initializeWindowTracking();
        setupIpcHandlers();
        setupDeepLinkHandlers(mainWindow);
    } catch (error) {
        log.error('Error during app initialization:', error);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const { window } = createMainWindow(app);
            mainWindow = window;
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});