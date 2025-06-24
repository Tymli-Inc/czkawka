import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

export function getTrayIconPath(): string {
  log.info('getTrayIconPath called');
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icons', 'tray.png');
  } else {
    return path.join(__dirname, '..', '..', 'assets', 'icons', 'tray.png');
  }
}

export function ensureSingleInstance(): boolean {
  log.info('ensureSingleInstance called');
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
    return false;
  }
  return true;
}