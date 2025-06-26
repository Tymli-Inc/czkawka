import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import ScreentimePage from './pages/ScreentimePage';
import CategoriesPage from './pages/CategoriesPage';
import type { ElectronAPI } from '../types/electronAPI';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
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
            background : "rgba(13, 13, 13, 1)",
            borderTop: '1px solid rgb(46, 46, 46)',
            borderLeft: '1px solid rgb(46, 46, 46)',
            borderTopLeftRadius: '8px',
          }}>            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/screentime" element={<ScreentimePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
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
