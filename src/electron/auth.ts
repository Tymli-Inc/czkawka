import path from 'path';
import { app, shell, BrowserWindow } from 'electron';
import { IncomingMessage } from 'http';
import {mainWindow} from "./main";
import Store from 'electron-store';
import log from "electron-log";
import {startActiveWindowTracking, stopActiveWindowTracking} from "./windowTracking";
export let store: any;

const protocol = 'hourglass';
let deeplinkUrl: string | null = null;

export function setupProtocolHandling() {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(protocol);
  } else {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
}

export async function setupDeepLinkHandlers(mainWindow: BrowserWindow | null) {
  try {
    store = new Store({
      name: 'user-tokens',
      defaults: {
        userData: null,
        isLoggedIn: false
      }
    });
    console.log('Electron Store path:', store.path);
    console.log('Initial store contents:', store.store);
  } catch (error) {
    console.error('Failed to initialize electron-store:', error);
  }


  const isLoggedIn = store?.get('isLoggedIn');
  const userValid = await validateLogin()
  if (!isLoggedIn) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'login.html'));
  } else if (!userValid) {
    await mainWindow.loadFile(path.join(app.getAppPath(), 'login.html'));
    mainWindow.webContents.send('auth-logout');
  } else {
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
  }


  app.on('second-instance', (event, argv) => {
    const urlArg = argv.find(arg => arg.startsWith('hourglass://'));
    if (urlArg) {
      deeplinkUrl = urlArg;
      handleDeepLink(urlArg, mainWindow);
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  app.on('open-url', (event, urlStr) => {
    event.preventDefault();
    deeplinkUrl = urlStr;
    handleDeepLink(urlStr, mainWindow);
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function handleDeepLink(urlStr: string, mainWindow: BrowserWindow | null) {
  try {
    const urlObj = new URL(urlStr);
    const code = urlObj.searchParams.get('code');
    console.log('Received deep link URL:', urlStr);
    
    if (code) {
      const { net } = require('electron');
      
      const authUrl = app.isPackaged 
        ? 'https://hourglass-auth.onrender.com/auth/token'
        : 'http://localhost:3000/auth/token';
      
      const request = net.request({
        method: 'POST',
        url: authUrl,
        headers: { 'Content-Type': 'application/json' }
      });
      
      request.on('response', (response: IncomingMessage) => {
        let body = '';
        response.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          const userData: {
            [key: string]: any;
          } = JSON.parse(body);
          console.log('Received user data from token endpoint:', userData);
          if (mainWindow && userData.token) {
            mainWindow.webContents.send('auth-success', userData);
          } else {
            mainWindow.webContents.send('auth-fail');
          }
        });
      });
      
      request.write(JSON.stringify({ code, redirect_uri: 'hourglass://' }));
      request.end();
    }
  } catch (err) {
    console.error('Failed to handle deep link', err);
  }  
}

export function handleLogin() {
  const authUrl = app.isPackaged 
    ? 'https://hourglass-auth.onrender.com/auth/google'
    : 'http://localhost:3000/auth/google';
  
  shell.openExternal(authUrl);
}

export function getDeeplinkUrl() {
  return deeplinkUrl;
}

export async function storeUserToken(userData: any) {
  try {
    if (!store) {
      throw new Error('Store not initialized');
    }
    let fetchedUserData : any = null;
    try {
      const res = await fetch('http://localhost:3000/api/v1/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      fetchedUserData = await res.json();
      log.info('Fetched user data from API:', fetchedUserData);
    } catch (error) {
      mainWindow.webContents.send('auth-fail');
    }
    store.set('userData', {
      ...fetchedUserData.data,
      token: userData.token,
      email: fetchedUserData?.data?.email || userData.email, // Fallback to userData.email if not present
      name: fetchedUserData?.data?.name || userData.name, // Fallback to userData.name if not present
      picture: fetchedUserData?.data?.picture || userData.picture // Fallback to userData.picture if not present
    });
    store.set('isLoggedIn', true);
    log.info('User data stored successfully');
    log.info('Store contents after saving:', store.store);
    startActiveWindowTracking()
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL!==undefined && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      const prodPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
      mainWindow.loadFile(prodPath);
    }
    return { success: true };
  } catch (error: any) {
    log.error('Failed to store user data:', error);
    return { success: false, error: error.message };
  }
}

export function getUserToken() {
  try {
    if (!store) {
      throw new Error('Store not initialized');
    }
    const userData = store.get('userData') as any;
    const isLoggedIn = store.get('isLoggedIn', false) as boolean;
    console.log('Retrieved from store - userData exists:', !!userData, 'isLoggedIn:', isLoggedIn);
    return { userData, isLoggedIn };
  } catch (error: any) {
    log.error('Failed to get user data:', error);
    return { userData: null, isLoggedIn: false };
  }
}

export function clearUserToken() {
  try {
    if (!store) {
      throw new Error('Store not initialized');
    }
    store.set('userData', null);
    store.set('isLoggedIn', false);
    log.info('User data cleared successfully');
    console.log('Store contents after clearing:', store.store);
    mainWindow.loadFile(path.join(app.getAppPath(), 'login.html'));
    stopActiveWindowTracking()
    return { success: true };
  } catch (error: any) {
    log.error('Failed to clear user data:', error);
    return { success: false, error: error.message };
  }
}

export function getLoginStatus() {
  try {
    if (!store) {
      throw new Error('Store not initialized');
    }
    const isLoggedIn = store.get('isLoggedIn', false) as boolean;
    return { isLoggedIn };
  } catch (error: any) {
    log.error('Failed to get login status:', error);
    return { isLoggedIn: false };
  }
}

export function getUserData(): { userData: any; success: boolean; error?: string } {
  try {
    if (!store) {
      throw new Error('Store not initialized');
    }
    const userData = store.get('userData') as any;
    console.log('Retrieved user data from store:', userData);
    return { userData, success: true };
  } catch (error: any) {
    log.error('Failed to get user data:', error);
    return { userData: null as any, success: false, error: error.message };
  }
}

export async function validateLogin() {
    try {
        const { userData, isLoggedIn } = getUserToken();
        if (!isLoggedIn || !userData) {
        console.log('User is not logged in or user data is missing');
        return false;
        }
        const res = await fetch('http://localhost:3000/api/v1/user/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${userData.token}`,
            'Content-Type': 'application/json',
        },
        });

        if (!res.ok) {
        console.error(`Failed to validate login: ${res.status}`);
        return false;
        }

        const fetchedUserData = await res.json();
        console.log('Fetched user data from API:', fetchedUserData);
        return true;
    } catch (error) {
        console.error('Error validating login:', error);
        return false;
    }
}