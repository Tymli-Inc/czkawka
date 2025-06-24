import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Timeline from '../components/timeline/timeline';
import type { CompileDataResponse, ActiveWindow, WindowHistoryEntry } from '../../types/windowTracking';

const HomePage = () => {
  const [activeWindow, setActiveWindow] = useState<ActiveWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<WindowHistoryEntry[]>([]);
  const [compileData, setCompileData] = useState<CompileDataResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'6hours' | '3days' | '7days'>('6hours');
  const [user, setUser] = useState<any>(null);

  const refreshHistory = async () => {
    try {
      const hist = await window.electronAPI.getActiveWindows();
      setHistory(hist);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchCompileData = async (filter: '6hours' | '3days' | '7days') => {
    try {
      let days: number;
      switch (filter) {
        case '6hours':
          days = 0.25; // 6 hours = 0.25 days
          break;
        case '3days':
          days = 3;
          break;
        case '7days':
          days = 7;
          break;
      }
      
      const result = await window.electronAPI.compileData(days);
      if (result.success) {
        setCompileData(result);
      } else {
        console.error('Failed to compile data');
      }
    } catch (err) {
      console.error('Error compiling data:', err);
    }
  };

  const loadStoredUser = async () => {
    try {
      const { userData, isLoggedIn } = await window.electronAPI.getUserToken();
      if (isLoggedIn && userData) {
        console.log('Found stored user data:', userData);
        setUser(userData);
      }
    } catch (err) {
      console.error('Error loading stored user:', err);
    }
  };
  useEffect(() => {
    loadStoredUser();
  }, []);

  useEffect(() => {
    async function fetchActiveWindow() {
      try {
        const data = await window.electronAPI.getActiveWindow();
        if (data && 'error' in data) {
          console.error('Error from main process:', data.error);
          setError(String(data.error || 'Unknown error'));
          setActiveWindow(null);
        } else if (data) {
          setActiveWindow(data);
          setError(null);
        } else {
          setActiveWindow(null);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching active window:', err);
        setError('Failed to fetch active window');
        setActiveWindow(null);
      }
    }

    fetchActiveWindow();

    const interval = setInterval(fetchActiveWindow, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCompileData(selectedFilter);
    }
  }, [selectedFilter, user]);

  return (
    <div>
      <Timeline />      
      {user ? (
        <div style={{ 
          marginTop: '-24px',
          padding: '20px', 
        }}>
          {activeWindow ? (            
            <div style={{
              padding: '20px', 
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'rgba(255, 255, 255, 0.5)',
                animation: 'shimmer 2s cubic-bezier(0.87, 0, 0.13, 1) infinite'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 156, 245, 1)',
                  boxShadow: '0 0 10px rgba(255, 156, 245, 0.5)',
                  marginRight: '12px',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '20px', 
                  fontWeight: '600',
                  background: 'linear-gradient(90deg, rgba(255, 156, 245, 1) 0%, rgba(165, 84, 232, 1) 31.61%, rgba(135, 125, 255, 1) 66.25%, rgba(125, 212, 255, 1) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Currently Tracking
                </h2>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'row', gap: '8px' }}>
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9E9E9E', 
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Application Title
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500',
                    wordBreak: 'break-word'
                  }}>
                    {activeWindow.title}
                  </div>
                </div>

                <div style={{
                  width: '100%',

                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9E9E9E', 
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Window ID
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontFamily: 'monospace',
                    color: '#FFB74D'
                  }}>
                    {activeWindow.id}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50',
                  marginRight: '8px',
                  animation: 'pulse 1s ease-in-out infinite'
                }} />
                <span style={{ 
                  color: '#4CAF50', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Automatic tracking is active (updates every second)
                </span>
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.7; transform: scale(1.1); }
                }
                @keyframes shimmer {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
            </div>
            ) : (
              <p>No active window detected (tracking will start automatically)</p>
            )}
        </div>
      ) : (
        <div style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          borderRadius: '8px',
          backgroundColor: '#000000'
        }}>
          <h2>Please Login</h2>
          <p>Please go to Settings to login with your Google account to start tracking.</p>
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default HomePage;
