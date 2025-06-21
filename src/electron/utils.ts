import path from 'path';
import { app } from 'electron';

export function getTrayIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icons', 'tray.png');
  } else {
    return path.join(__dirname, '..', '..', 'assets', 'icons', 'tray.png');
  }
}

export function ensureSingleInstance(): boolean {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
    return false;
  }
  return true;
}