import React, { useState, useEffect, CSSProperties } from 'react';

const TopBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    // Check if window is maximized on mount
    const checkMaximized = async () => {
      if (window.electronAPI) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();

    // Listen for window maximize/unmaximize events
    if (window.electronAPI?.onWindowMaximized) {
      window.electronAPI.onWindowMaximized((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }

    // Cleanup listener on unmount
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

  const titleBarStyle: CSSProperties = {
    width: '100%',
    height: '40px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #333',
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
    height: '40px',
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
      <div>
        <h3 style={{ marginLeft: 15, fontSize: 14, color: 'white' }}>Hourglass</h3>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px' 
      }}>
        <span style={{ 
          color: '#ccc', 
          fontSize: '14px',
          marginRight: '20px'
        }}>
          Window Tracking Application
        </span>
        
        {/* Window Control Buttons */}
        <div style={windowControlsStyle}>          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            style={buttonBaseStyle}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#333'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="5" width="10" height="2" fill="currentColor"/>
            </svg>
          </button>

          {/* Maximize/Restore Button */}
          <button
            onClick={handleMaximize}
            style={{...buttonBaseStyle, fontSize: '14px'}}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#333'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
                <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
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
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
