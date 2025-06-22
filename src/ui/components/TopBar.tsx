import React, { useState, useEffect, CSSProperties } from 'react';
import styles from "./topbar.module.css"; 
import { Link, useLocation } from 'react-router-dom';
import hourglassLogo from '../../../assets/icons/hourglass.png';
const TopBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  
  
  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electronAPI) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();

    if (window.electronAPI?.onWindowMaximized) {
      window.electronAPI.onWindowMaximized((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }

    return () => {
      if (window.electronAPI?.removeWindowListener) {
        window.electronAPI.removeWindowListener();
      }
    };
  }, []);

  const handleMinimize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.windowMinimize();
    }
  };
  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.windowMaximize();
      // Check the new state after the operation
      const maximized = await window.electronAPI.windowIsMaximized();
      setIsMaximized(maximized);
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.windowClose();
    }
  };

  const loadStoredUser = async () => {
    try {
      const { userData, isLoggedIn } = await window.electronAPI.getUserToken();
      if (isLoggedIn && userData) {
        setUser(userData);
      }
    } catch (err) {}
  };
  useEffect(() => {
    loadStoredUser();
  }, []);
  function UserBar() {

    
    return (
      <Link to="/settings" style={{
        textDecoration: 'none',
      }} className={styles.userBar}>
        {user ? (
          <div className={styles.userInfo}>
            <img src={user.image || hourglassLogo} alt="User Avatar" className={styles.userAvatar} />
            <p>{user.name}</p>
          </div>
        ) : (
          <button onClick={window.electronAPI?.login}>Login</button>
        )}
      </Link>
    );
  }


  const titleBarStyle: CSSProperties = {
    width: '100%',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    // @ts-ignore
    WebkitAppRegion: 'drag',
  };

  const windowControlsStyle: CSSProperties = {
    display: 'flex',
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  };

  const buttonBaseStyle: CSSProperties = {
    width: '46px',
    height: '52px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ccc',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };
  return (
    <div 
      style={titleBarStyle}
      onDoubleClick={handleMaximize} // Double-click to maximize/restore
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        // @ts-ignore
        WebkitAppRegion: 'drag',
      }}>        <img
          src={hourglassLogo}
          alt="Hourglass Logo"
          style={{ width: 27, height: 27, marginLeft: 27 }}
        />
        <h3 style={{ marginLeft: 15, fontWeight: 100, fontSize: 12, color: 'white' }}>Hourglass</h3>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px' 
      }}>
        <div style={{ 
          color: '#ccc', 
          fontSize: '14px',
          marginRight: '20px',
          // @ts-ignore
          WebkitAppRegion: 'no-drag',
          backgroundColor: location.pathname === '/settings' ? 'rgba(255, 255, 255, 0.1)' : 'inherit',
        }}
          className={styles.title}
        >
          <UserBar />
        </div>
        
        {/* Window Control Buttons */}
        <div style={windowControlsStyle}>          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            style={buttonBaseStyle}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#333'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="6" width="10" height="1" fill="currentColor"/>
            </svg>
          </button>

          {/* Maximize/Restore Button */}
          <button
            onClick={handleMaximize}
            style={{...buttonBaseStyle, fontSize: '14px'}}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#333'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
          >            {isMaximized ? (
              <>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none" style={{ borderRadius: '2px' }}>
                <svg width="8" height="8" viewBox="0 0 6 8" fill="none" style={{ borderRadius: '2px' }}>
                  <rect x="0" y="2" width="6" height="6" stroke="currentColor" strokeWidth="0.4" fill="none" />
                  <rect x="0" y="2" width="6" height="6" stroke="currentColor" strokeWidth="0.4" fill="none"/>
                </svg>
                  <rect x="2" y="-1" width="8" height="1" stroke="currentColor" strokeWidth="0.4" fill="none"/>
                  <rect x="2" y="-1" width="8" height="1" stroke="currentColor" strokeWidth="0.4" fill="none"/>
                  <rect x="10" y="0" width="1" height="6" stroke="currentColor" strokeWidth="0.4" fill="none"/>
                  <rect x="10" y="0" width="1" height="6" stroke="currentColor" strokeWidth="0.4" fill="none"/>
                </svg>
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 9 9" fill="none" style={{ borderRadius: '2px' }}>
                  <rect x="0" y="0" width="9" height="9" stroke="currentColor" strokeWidth="0.5" fill="none"/>
                  <rect x="0" y="0" width="9" height="9" stroke="currentColor" strokeWidth="0.5" fill="none"/>
                </svg>
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            style={buttonBaseStyle}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e81123'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth=".5" strokeLinecap="round"/>
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth=".5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
