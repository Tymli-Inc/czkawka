import React, { useEffect, useState } from 'react';
import moment from 'moment';

declare global {
  interface Window {
    electronAPI: {
      getActiveWindow: () => Promise<{ title: string ; id: number ; error?: string} | null>;
      saveActiveWindow: (data: { title: string; unique_id: number; error?: string }) => Promise<{ success: boolean }>;
      getActiveWindows: () => Promise<Array<{ id: number; title: string; unique_id: number; timestamp: number, session_length: number }>>;
      compileData: () => Promise<{ success: boolean; data: { title: string; session_length: number }[] }>;
      login: () => Promise<void>;
      onAuthSuccess: (callback: (userData: any) => void) => void;
      removeAuthListener: () => void;
    };
  }
}

const App = () => {
  const [activeWindow, setActiveWindow] = useState<{ id: number; title: string; error?: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; title: string; unique_id: number; timestamp: number, session_length: number }>>([]);
  const [compileData, setCompileData] = useState<{ success: boolean, data: {
    title: string; session_length: number
    }[] } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);  const refreshHistory = async () => {
    try {
      const hist = await window.electronAPI.getActiveWindows();
      setHistory(hist);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await window.electronAPI.login();
    } catch (err) {
      console.error('Error initiating login:', err);
      setError('Failed to initiate login');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('userData');
  };
  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user data:', err);
        localStorage.removeItem('userData');
      }
    }

    window.electronAPI.onAuthSuccess((userData) => {
      console.log('Authentication successful:', userData);
      setUser(userData);
      setIsLoggingIn(false);
      localStorage.setItem('userData', JSON.stringify(userData));
    });

    return () => {
      window.electronAPI.removeAuthListener();
    };
  }, []);

  useEffect(() => {
    async function fetchActiveWindow() {
      try {
        const data = await window.electronAPI.getActiveWindow();
          if (data && 'error' in data) {
          console.error('Error from main process:', data.error);
          setError(String(data.error || 'Unknown error'));
          setActiveWindow(null);        } else if (data) {
          setActiveWindow(data);
          setError(null);
          await window.electronAPI.saveActiveWindow({ title: data.title, unique_id: data.id });
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

    const interval = setInterval(fetchActiveWindow, 5000);
    return () => clearInterval(interval);  }, []);
  useEffect(() => {
    refreshHistory();
  }, []);  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Active Window Tracker</h1>
      
      <div style={{ 
        marginBottom: '30px', 
        padding: '15px', 
        borderRadius: '8px',
        backgroundColor: '#000000'
      }}>
        <h2>Authentication</h2>
        {user ? (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {user.picture && (
                  <img 
                    src={user.picture} 
                    alt="Profile" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                  />
                )}
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{user.name}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
            {activeWindow ? (
            <div>
                <h2>Current Active Window</h2>
                <p>Title: {activeWindow.title}</p>
                <p>id: {activeWindow.id}</p>
            </div>
            ) : (
              <p>No active window detected</p>
            )}
            <div>
              <h2>Compile Data</h2>
              <button
                onClick={async () => {
                  try {
                    const result = await window.electronAPI.compileData();
                    if (result.success) {
                      setCompileData(result);
                    } else {
                      alert('Failed to compile data');
                    }
                  } catch (err) {
                    console.error('Error compiling data:', err);
                    alert('Error compiling data');
                  }
              }}>Compile</button>
              {compileData && (
                  <div>
                      <h3>Compiled Data</h3>
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
            </div>
          </>
        ) : (
          <div>
            <p>Not logged in</p>
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              style={{
                padding: '10px 20px',
                backgroundColor: isLoggingIn ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoggingIn ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoggingIn ? 'Opening browser...' : 'Login with Google'}
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default App;
