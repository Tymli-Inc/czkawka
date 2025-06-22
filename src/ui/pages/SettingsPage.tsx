import React, { useEffect, useState } from 'react';

const SettingsPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(1);
  const [autoCompile, setAutoCompile] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadUserData = async () => {
    try {
      const result = await window.electronAPI.getUserData();
      if (result.success && result.userData) {
        setUser(result.userData);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await window.electronAPI.login();
    } catch (err) {
      console.error('Error initiating login:', err);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.clearUserToken();
      setUser(null);
      console.log('User logged out successfully');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  const handleSaveSettings = () => {
    console.log('Settings saved:', {
      trackingInterval,
      autoCompile,
      showNotifications
    });
    alert('Settings saved successfully!');
  };
  useEffect(() => {
    loadStoredUser();
    window.electronAPI.onAuthSuccess(async (userData) => {
      console.log('Authentication successful:', userData);
      setUser(userData);
      setIsLoggingIn(false);
      
      try {
        await window.electronAPI.storeUserToken(userData);
        console.log('User data stored successfully');
      } catch (err) {
        console.error('Error storing user data:', err);
      }
    });

    return () => {
      window.electronAPI.removeAuthListener();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Settings</h1>
      
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Authentication</h3>
        {user ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              {user.picture && (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  style={{ width: '50px', height: '50px', borderRadius: '50%' }}
                />
              )}
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{user.name}</p>
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
        ) : (
          <div>
            <p style={{ marginBottom: '15px', color: '#ccc' }}>
              Login with your Google account to start tracking windows and save your data.
            </p>
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
      <p>Configure your window tracking preferences.</p>
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3>Configuration Options</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Tracking Interval (seconds):
          </label>
          <input 
            type="number" 
            value={trackingInterval}
            onChange={(e) => setTrackingInterval(parseInt(e.target.value) || 1)}
            min="1"
            max="60"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #555',
              backgroundColor: '#333',
              color: 'white'
            }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={autoCompile}
              onChange={(e) => setAutoCompile(e.target.checked)}
            />
            Enable automatic data compilation
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={showNotifications}
              onChange={(e) => setShowNotifications(e.target.checked)}
            />
            Show notifications for long sessions
          </label>
        </div>
        <button 
          onClick={handleSaveSettings}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
