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
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import Questionnaire from './components/questionnaire/Questionnaire';
import { FocusProvider } from './contexts/FocusContext';
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to check authentication status
  const checkAuthenticationStatus = async () => {
    try {
      setIsLoading(true);
      const { userData, isLoggedIn: loggedIn } = await window.electronAPI.getUserToken();
      console.log('Auth check result:', { userData: !!userData, isLoggedIn: loggedIn });
      
      // If not logged in, don't proceed with app initialization
      if (!loggedIn) {
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }
      
      setIsLoggedIn(loggedIn);
      
      if (loggedIn && userData?.id) {
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
      console.error('Error checking authentication status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Listen for questionnaire events
    const handleShowQuestionnaire = (data: { userId: string; userName: string }) => {
      setQuestionnaireData(data);
      setShowQuestionnaire(true);
    };

    // Listen for auth success events
    const handleAuthSuccess = (userData: any) => {
      console.log('Auth success detected, rechecking auth status...', userData);
      checkAuthenticationStatus();
    };

    // Listen for auth logout events
    const handleAuthLogout = () => {
      console.log('Auth logout detected');
      setIsLoggedIn(false);
      setShowQuestionnaire(false);
      setQuestionnaireData(null);
    };

    window.electronAPI.onShowQuestionnaire(handleShowQuestionnaire);
    window.electronAPI.onAuthSuccess(handleAuthSuccess);
    window.electronAPI.onAuthLogout(handleAuthLogout);

    // Initial authentication check
    checkAuthenticationStatus();

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeQuestionnaireListener();
      window.electronAPI.removeAuthListener();
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
    <FocusProvider>
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
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </FocusProvider>
  );
};

export default App;
