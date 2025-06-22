import React, { useEffect, useState } from 'react';
import moment from 'moment';

const HomePage = () => {
  const [activeWindow, setActiveWindow] = useState<{ id: number; title: string; error?: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; title: string; unique_id: number; timestamp: number, session_length: number }>>([]);  const [compileData, setCompileData] = useState<{ success: boolean, data: {
    title: string; session_length: number
    }[] } | null>(null);
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
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Active Window Tracker</h1>
      
      {user ? (
        <div style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          borderRadius: '8px',
          backgroundColor: '#000000'
        }}>
          {activeWindow ? (
            <div>
                <h2>Currently Tracking</h2>
                <p>Title: {activeWindow.title}</p>
                <p>ID: {activeWindow.id}</p>
                <p style={{ color: '#4CAF50', fontSize: '14px' }}>
                  ✓ Automatic tracking is active (updates every second)
                </p>
            </div>
            ) : (
              <p>No active window detected (tracking will start automatically)</p>
            )}            <div>
              <h2>Compile Data</h2>
              
              <div style={{ 
                display: 'flex', 
                marginBottom: '20px',
                borderBottom: '2px solid #333'
              }}>
                {[
                  { key: '6hours', label: 'Last 6 Hours' },
                  { key: '3days', label: 'Last 3 Days' },
                  { key: '7days', label: 'Last 7 Days' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedFilter(tab.key as '6hours' | '3days' | '7days')}
                    style={{
                      padding: '10px 20px',
                      marginRight: '5px',
                      backgroundColor: selectedFilter === tab.key ? '#4CAF50' : '#333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px 4px 0 0',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: selectedFilter === tab.key ? 'bold' : 'normal',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {compileData && (
                  <div>
                      <h3>
                        Compiled Data ({selectedFilter === '6hours' ? 'Last 6 Hours' : selectedFilter === '3days' ? 'Last 3 Days' : 'Last 7 Days'})
                      </h3>
                      <ul style={{
                          listStyleType: 'none',
                          padding: 0,
                          margin: 0,
                          backgroundColor: '#202020',
                          color: '#fff'
                      }}>
                      {compileData.data.map((item, index) => (
                          <li style={{
                              marginBottom: '10px',
                              padding: '5px',
                              backgroundColor: index % 2 === 0 ? '#131313' : '#1f1f1f'
                          }} key={index}>
                            <div>
                              <strong>Title:</strong> {item.title} <br />
                              <strong>Session Length:</strong> {moment.duration(item.session_length).minutes() + 'm ' + moment.duration(item.session_length).seconds() + 's'}  <br />
                            </div>
                          </li>
                      ))}
                      </ul>
                  </div>
              )}
              { /*
              <h2>History ({history.length} records)</h2>
              <button onClick={refreshHistory} style={{ marginBottom: '10px' }}>
                Refresh History
              </button>
              <ul>
                {history.map((entry) => (
                  <li key={entry.id} style={{ marginBottom: '10px', padding: '5px', border: '1px solid #ccc' }}>
                    <strong>{new Date(entry.timestamp).toLocaleString()}</strong><br/> 
                    Title: {entry.title} <br/>
                    ID: {entry.id ?? 'N/A'} <br/>
                    Timestamp: {new Date(entry.timestamp).toLocaleString()} <br/>
                    Session Duration: {entry.session_length}ms <br/>
                  </li>
                ))}
              </ul>
              */
              }
            </div>
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
