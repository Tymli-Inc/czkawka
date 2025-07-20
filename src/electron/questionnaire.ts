import { BrowserWindow, app } from 'electron';
import Store from 'electron-store';
import path from 'path';
import log from 'electron-log';
import { getUserToken } from './auth';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const store = new Store();

export async function checkUserInfoAvailable(userId: string): Promise<{ available: boolean; success: boolean; error?: string }> {
  log.info('checkUserInfoAvailable called for userId:', userId);
  try {
    const { userData } = getUserToken();
    if (!userData?.token) {
      throw new Error('No valid token found');
    }

    const apiUrl = app.isPackaged 
      ? 'https://hourglass-auth.vercel.app/api/v1/user/info/available'
      : 'http://localhost:3000/api/v1/user/info/available';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!res.ok) {
      throw new Error(`Failed to check info availability: ${res.status}`);
    }

    const response = await res.json();
    log.info('Info availability check response:', response);
    return { available: response.data.available, success: true };
  } catch (error: any) {
    log.error('Failed to check user info availability:', error);
    return { available: false, success: false, error: error.message };
  }
}

export async function storeUserInfoAPI(userInfo: {
  token: string;
  name: string;
  job_role: string;
  referralSource: string;
  work_type: string[];
  team_mode: string;
  daily_work_hours: string;
  distraction_apps: string[];
  distraction_content_types: string[];
  distraction_time: string;
  productivity_goal: string;
  enforcement_preference: string;
}): Promise<{ success: boolean; error?: string }> {
  log.info('storeUserInfoAPI called with:', userInfo);
  try {
    const { userData } = getUserToken();
    if (!userData?.token) {
      throw new Error('No valid token found');
    }

    // Convert arrays to JSON strings for API
    const apiUserInfo = {
      ...userInfo,
      work_type: JSON.stringify(userInfo.work_type),
      distraction_apps: JSON.stringify(userInfo.distraction_apps),
      distraction_content_types: JSON.stringify(userInfo.distraction_content_types),
      token: userData.token
    };

    log.info('Sending to API:', apiUserInfo);

    const apiUrl = app.isPackaged 
      ? 'https://hourglass-auth.vercel.app/api/v1/user/info/store'
      : 'http://localhost:3000/api/v1/user/info/store';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiUserInfo)
    });

    log.info('Response status:', res.status);
    
    if (!res.ok) {
      // Get the error response body for better debugging
      const errorText = await res.text();
      log.error('Error response:', errorText);
      throw new Error(`Failed to store user info: ${res.status} - ${errorText}`);
    }

    const response = await res.json();
    log.info('Store user info response:', response);

    // Store locally as well
    store.set('userInfo', userInfo);
    log.info('User info stored locally');

    return { success: true };
  } catch (error: any) {
    log.error('Failed to store user info:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserInfoAPI(): Promise<{ data: any; success: boolean; error?: string }> {
  try {
    const { userData } = getUserToken();
    if (!userData?.token) {
      throw new Error('No valid token found');
    }

    const apiUrl = app.isPackaged 
      ? 'https://hourglass-auth.vercel.app/api/v1/user/info/fetch'
      : 'http://localhost:3000/api/v1/user/info/fetch';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: userData.token })
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch user info: ${res.status}`);
    }

    const response = await res.json();
    log.info('Fetch user info response:', response);

    // Parse JSON strings back to arrays
    const userInfo = {
      ...response.data,
      work_type: JSON.parse(response.data.work_type || '[]'),
      distraction_apps: JSON.parse(response.data.distraction_apps || '[]'),
      distraction_content_types: JSON.parse(response.data.distraction_content_types || '[]')
    };

    // Store locally
    store.set('userInfo', userInfo);
    log.info('User info stored locally after fetch');

    return { data: userInfo, success: true };
  } catch (error: any) {
    log.error('Failed to fetch user info:', error);
    return { data: null, success: false, error: error.message };
  }
}

export function getUserInfoLocal(): any {
  log.info('getUserInfoLocal called');
  try {
    const userInfo = store.get('userInfo', null);
    log.info('Retrieved local user info:', userInfo);
    return userInfo;
  } catch (error: any) {
    log.error('Failed to get local user info:', error);
    return null;
  }
}

export async function handleQuestionnaire(mainWindow: BrowserWindow | null, userId: string, userName: string) {
  log.info('handleQuestionnaire called');
  try {
    if (!userId) {
      log.error('No user ID provided');
      return;
    }
    
    // Check if info is available locally first
    const localInfo = getUserInfoLocal();
    if (localInfo) {
      log.info('User info available locally, proceeding to main app');
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow?.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      } else {
        mainWindow?.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
      }
      return;
    }

    // Check if info is available on server
    const { available, success } = await checkUserInfoAvailable(userId);
    if (!success) {
      log.error('Failed to check info availability, proceeding to questionnaire');
      mainWindow?.webContents.send('show-questionnaire', { 
        userId, 
        userName 
      });
      return;
    }

    if (available) {
      log.info('User info available on server, fetching and storing locally');
      const { data, success: fetchSuccess } = await fetchUserInfoAPI();
      if (fetchSuccess && data) {
        log.info('User info fetched and stored locally, proceeding to main app');
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          mainWindow?.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
          mainWindow?.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
        }
      } else {
        log.error('Failed to fetch user info, showing questionnaire');
        mainWindow?.webContents.send('show-questionnaire', { 
          userId, 
          userName 
        });
      }
    } else {
      log.info('User info not available, showing questionnaire');
      mainWindow?.webContents.send('show-questionnaire', { 
        userId, 
        userName 
      });
    }
  } catch (error) {
    log.error('Error in questionnaire handler:', error);
    // Show questionnaire as fallback
    mainWindow?.webContents.send('show-questionnaire', { 
      userId, 
      userName 
    });
  }
}
