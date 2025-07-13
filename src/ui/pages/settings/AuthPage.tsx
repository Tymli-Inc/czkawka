import { useEffect, useState } from 'react';
import { MdLogin, MdLogout } from 'react-icons/md';

const AuthPage = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    try {
      const result = await window.electronAPI.getUserData();
      if (result.success && result.userData) {
        setUser(result.userData);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await window.electronAPI.login();
      // Reload user data after login
      await loadUserData();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.clearUserToken();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '200px'
      }}>
        <p style={{ color: 'white' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 20px 0', color: 'white' }}>Authentication</h3>
      
      {isAuthenticated && user ? (
        <div style={{ 
          backgroundColor: '#0a0a0a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid rgba(76, 175, 80, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            {user.picture && (
              <img 
                src={user.picture} 
                alt="Profile" 
                style={{ width: '60px', height: '60px', borderRadius: '50%' }}
              />
            )}
            <div>
              <h4 style={{ margin: 0, color: '#4CAF50', fontSize: '18px' }}>
                Signed in as {user.name}
              </h4>
              <p style={{ margin: '5px 0', color: '#aaa', fontSize: '14px' }}>{user.email}</p>
              <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>ID: {user.id}</p>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: 'white', marginBottom: '10px' }}>Account Status</h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: '#4CAF50', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ color: '#4CAF50', fontSize: '14px' }}>Active</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}
          >
            <MdLogout size={16} />
            Sign Out
          </button>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: '#0a0a0a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          textAlign: 'center'
        }}>
          <h4 style={{ color: '#FF9800', margin: '0 0 15px 0' }}>Sign In Required</h4>
          <p style={{ color: '#aaa', marginBottom: '20px' }}>
            Sign in with your Google account to access all features and sync your data.
          </p>
          <button
            onClick={handleLogin}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              margin: '0 auto'
            }}
          >
            <MdLogin size={18} />
            Sign In with Google
          </button>
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h4 style={{ color: 'white', marginBottom: '15px' }}>Privacy & Security</h4>
        <div style={{ 
          backgroundColor: '#0a0a0a', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '14px' }}>
            • Your data is stored locally on your device
          </p>
          <p style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '14px' }}>
            • Authentication is handled securely through Google OAuth
          </p>
          <p style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '14px' }}>
            • We never store your Google password or sensitive account information
          </p>
          <p style={{ color: '#aaa', margin: '0', fontSize: '14px' }}>
            • You can sign out at any time to revoke access
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
