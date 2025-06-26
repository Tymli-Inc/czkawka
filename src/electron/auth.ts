import path from 'path';
import { app, shell, BrowserWindow } from 'electron';
import { IncomingMessage } from 'http';
import {mainWindow} from "./main";
import Store from 'electron-store';
import log from "electron-log";
import {startActiveWindowTracking, stopActiveWindowTracking} from "./windowTracking";
import { initializeDatabase } from './database';
import type { UserData } from '../types/electronAPI';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

export let store: any;

function initializeStore() {
  if (!store) {
    try {
      store = new Store({
        name: 'user-tokens',
        defaults: {
          userData: null,
          isLoggedIn: false
        }
      });
      log.info('Electron Store initialized at:', store.path);
      log.info('Initial store contents:', store.store);
    } catch (error) {
      log.error('Failed to initialize electron-store:', error);
      throw error;
    }
  }
  return store;
}

initializeStore();

const protocol = 'hourglass';
let deeplinkUrl: string | null = null;

// Log when auth module is loaded
log.info('Auth module loaded');

export function setupProtocolHandling() {
  log.info('Setting up protocol handling for protocol:', protocol);
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(protocol);
  } else {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
}

export async function setupDeepLinkHandlers(mainWindow: BrowserWindow | null) {
  log.info('Setting up deep link handlers');
  initializeStore();
  log.info('DeepLink initial store state:', { isLoggedIn: store.get('isLoggedIn') });
  const isLoggedIn = store?.get('isLoggedIn');
  const userValid = await validateLogin();
  log.info('DeepLink login status:', isLoggedIn, 'userValid:', userValid);
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
    log.info('Second-instance event:', argv);
    const urlArg = argv.find(arg => arg.startsWith('hourglass://'));
    if (urlArg) {
      deeplinkUrl = urlArg;
      handleDeepLink(urlArg, mainWindow);
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  app.on('open-url', (event, urlStr) => {
    log.info('Open-url event with URL:', urlStr);
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
    log.info('Received deep link URL:', urlStr);
    
    if (code) {
      const { net } = require('electron');
      
      const authUrl = app.isPackaged 
        ? 'https://hourglass-auth.vercel.app/auth/token'
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
          log.info('Received user data from token endpoint:', userData);
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
    log.error('Failed to handle deep link', err);
  }  
}

export function handleLogin() {
  log.info('handleLogin: opening auth URL');
  const authUrl = app.isPackaged 
    ? 'https://hourglass-auth.vercel.app/auth/google'
    : 'http://localhost:3000/auth/google';
  
  shell.openExternal(authUrl);
}

export function getDeeplinkUrl() {
  log.info('getDeeplinkUrl called, returning:', deeplinkUrl);
  return deeplinkUrl;
}

export async function storeUserToken(userData: UserData) {
  log.info('storeUserToken called with userData token:', userData.token);
  try {
    initializeStore();
    
    if (!store) {
      throw new Error('Store not initialized');
    }
      let fetchedUserData : any = null;
    try {
      const apiUrl = app.isPackaged 
        ? 'https://hourglass-auth.vercel.app/api/v1/user/me'
        : 'http://localhost:3000/api/v1/user/me';
        
      const res = await fetch(apiUrl, {
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
      log.error('Failed to fetch user data from API:', error);
      // Don't send auth-fail here, continue with userData from token
      fetchedUserData = null;
    }
    
    // Store user data with proper fallbacks
    const userDataToStore = {
      token: userData.token,
      email: fetchedUserData?.data?.email || userData.email,
      name: fetchedUserData?.data?.name || userData.name,
      picture: fetchedUserData?.data?.picture || userData.picture,
      // Include any additional data from API if available
      ...(fetchedUserData?.data || {})
    };
    
    store.set('userData', userDataToStore);
    store.set('isLoggedIn', true);
    initializeDatabase()
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
  log.info('getUserToken called');
  try {
    initializeStore();
    
    if (!store) {
      throw new Error('Store not initialized');
    }
    const userData = store.get('userData') as any;
    const isLoggedIn = store.get('isLoggedIn', false) as boolean;
    log.info('Retrieved from store - userData exists:', !!userData, 'isLoggedIn:', isLoggedIn);
    log.info('getUserToken retrieved:', { isLoggedIn, userData });
    return { userData, isLoggedIn };
  } catch (error: any) {
    log.error('Failed to get user data:', error);
    return { userData: null, isLoggedIn: false };
  }
}

export function clearUserToken() {
  log.info('clearUserToken called');
  try {
    // Ensure store is initialized
    initializeStore();
    
    if (!store) {
      throw new Error('Store not initialized');
    }
    store.set('userData', null);
    store.set('isLoggedIn', false);
    log.info('User data cleared successfully');
    log.info('Store contents after clearing:', store.store);
    mainWindow.loadFile(path.join(app.getAppPath(), 'login.html'));
    stopActiveWindowTracking()
    return { success: true };
  } catch (error: any) {
    log.error('Failed to clear user data:', error);
    return { success: false, error: error.message };
  }
}

export function getLoginStatus() {
  log.info('getLoginStatus called');
  try {
    // Ensure store is initialized
    initializeStore();
    
    if (!store) {
      throw new Error('Store not initialized');
    }
    const isLoggedIn = store.get('isLoggedIn', false) as boolean;
    log.info('getLoginStatus:', isLoggedIn);
    return { isLoggedIn };
  } catch (error: any) {
    log.error('Failed to get login status:', error);
    return { isLoggedIn: false };
  }
}

export function getUserData(): { userData: any; success: boolean; error?: string } {
  log.info('getUserData called');
  try {
    // Ensure store is initialized
    initializeStore();
    
    if (!store) {
      throw new Error('Store not initialized');
    }
    const userData = store.get('userData') as any;
    log.info('Retrieved user data from store:', userData);
    return { userData, success: true };
  } catch (error: any) {
    log.error('Failed to get user data:', error);
    return { userData: null as any, success: false, error: error.message };
  }
}

export async function validateLogin() {
  log.info('validateLogin called');
  try {
      const { userData, isLoggedIn } = getUserToken();
      if (!isLoggedIn || !userData) {
      log.info('User is not logged in or user data is missing');
      return false;
      }
      
      const apiUrl = app.isPackaged 
        ? 'https://hourglass-auth.vercel.app/api/v1/user/me'
        : 'http://localhost:3000/api/v1/user/me';
        
      const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
      },
      });

      if (!res.ok) {
        log.error(`Failed to validate login: ${res.status}`);
        return false;
      }

      const fetchedUserData = await res.json();
      log.info('Fetched user data from API:', fetchedUserData);
      log.info('User validation successful');
      return true;
  } catch (error) {
      log.error('Error validating login:', error);
      return false;
  }
}