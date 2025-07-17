import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import ScreentimePage from './pages/ScreentimePage';
import CategoriesPage from './pages/CategoriesPage';
import Blocking from './pages/Blocking';
import FocusMode from './pages/FocusMode';
import Questionnaire from './components/questionnaire/Questionnaire';
import type { ElectronAPI } from '../types/electronAPI';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const App = () => {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  useEffect(() => {
    // Listen for questionnaire events
    const handleShowQuestionnaire = (data: { userId: string; userName: string }) => {
      setQuestionnaireData(data);
      setShowQuestionnaire(true);
    };

    window.electronAPI.onShowQuestionnaire(handleShowQuestionnaire);

    // Check if we need to show questionnaire on app load
    const checkQuestionnaireStatus = async () => {
      try {
        const { userData, isLoggedIn } = await window.electronAPI.getUserToken();
        if (isLoggedIn && userData?.id) {
          const localInfo = await window.electronAPI.getUserInfoLocal();
          if (!localInfo) {
            // No local info, check if available on server
            const { available } = await window.electronAPI.checkUserInfoAvailable(userData.id);
            if (!available) {
              setQuestionnaireData({
                userId: userData.id,
                userName: userData.name || userData.email || 'User'
              });
              setShowQuestionnaire(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking questionnaire status:', error);
      }
    };

    checkQuestionnaireStatus();

    // Cleanup listener on unmount
    return () => {
      window.electronAPI.removeQuestionnaireListener();
    };
  }, []);

  const handleQuestionnaireComplete = () => {
    setShowQuestionnaire(false);
    setQuestionnaireData(null);
  };

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false);
    setQuestionnaireData(null);
  };

  if (showQuestionnaire && questionnaireData) {
    return (
      <Questionnaire
        userId={questionnaireData.userId}
        userName={questionnaireData.userName}
        onComplete={handleQuestionnaireComplete}
        onSkip={handleQuestionnaireSkip}
      />
    );
  }

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
          }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/screentime" element={<ScreentimePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/settings/*" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blocking" element={<Blocking />} />
              <Route path="/focus" element={<FocusMode />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
