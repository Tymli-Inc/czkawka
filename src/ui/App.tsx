import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';

declare global {
  interface Window {
    electronAPI: {
      getActiveWindow: () => Promise<{ title: string ; id: number ; error?: string} | null>;
      saveActiveWindow: (data: { title: string; unique_id: number; error?: string }) => Promise<{ success: boolean }>;
      getActiveWindows: () => Promise<Array<{ id: number; title: string; unique_id: number; timestamp: number, session_length: number }>>;
      compileData: () => Promise<{ success: boolean; data: { title: string; session_length: number }[] }>;
      login: () => Promise<void>;
      onAuthSuccess: (callback: (userData: any) => void) => void;
      onAuthFailure: (callback: () => void) => void;
      onAuthLogout: (callback: () => void) => void;
      removeAuthListener: () => void;
      storeUserToken: (userData: any) => Promise<{ success: boolean; error?: string }>;
      getUserToken: () => Promise<{ userData: any | null; isLoggedIn: boolean }>;
      clearUserToken: () => Promise<{ success: boolean; error?: string }>;
      getLoginStatus: () => Promise<{ isLoggedIn: boolean }>;
      // Window control APIs
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowIsMaximized: () => Promise<boolean>;
      onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
      removeWindowListener: () => void;
    };
  }
}

const App = () => {
  return (
    <Router>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ 
            flex: 1, 
            overflow: 'auto',
            backgroundColor: '#0e0e0e'
          }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
