import path from 'path';
import { app, shell, BrowserWindow } from 'electron';
import { IncomingMessage } from 'http';

const protocol = 'hourglass';
let deeplinkUrl: string | null = null;

export function setupProtocolHandling() {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(protocol);
  } else {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
  }
}

export function setupDeepLinkHandlers(mainWindow: BrowserWindow | null) {
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
          const userData = JSON.parse(body);
          if (mainWindow) {
            mainWindow.webContents.send('auth-success', userData);
          }
        });
        console.log('Response received from token endpoint:', body);
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