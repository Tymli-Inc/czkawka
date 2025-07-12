import { useEffect, useState } from 'react';
import { MdRefresh, MdSettings, MdCloudSync } from 'react-icons/md';

const ConfigurationPage = () => {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [idleThreshold, setIdleThreshold] = useState(5);
  const [idleStatus, setIdleStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadConfiguration = async () => {
    try {
      const trackingStatus = await window.electronAPI.getWindowTrackingStatus();
      setTrackingEnabled(trackingStatus);
      
      const currentIdleStatus = await window.electronAPI.getCurrentIdleStatus();
      setIdleStatus(currentIdleStatus);
      
      // Convert idle threshold from milliseconds to minutes
      if (currentIdleStatus && currentIdleStatus.idleThreshold) {
        setIdleThreshold(currentIdleStatus.idleThreshold / (1000 * 60));
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTracking = async () => {
    try {
      const newStatus = await window.electronAPI.toggleWindowTracking();
      setTrackingEnabled(newStatus);
    } catch (error) {
      console.error('Error toggling tracking:', error);
    }
  };

  const handleIdleThresholdChange = async (newThreshold: number) => {
    try {
      const thresholdMs = newThreshold * 1000 * 60; // Convert minutes to milliseconds
      const result = await window.electronAPI.setIdleThreshold(thresholdMs);
      if (result.success) {
        setIdleThreshold(newThreshold);
      }
    } catch (error) {
      console.error('Error setting idle threshold:', error);
    }
  };

  const handleResetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        await window.electronAPI.resetCategoriesToDefaults();
        await loadConfiguration();
        alert('Settings reset successfully!');
      } catch (error) {
        console.error('Error resetting settings:', error);
        alert('Failed to reset settings. Please try again.');
      }
    }
  };

  useEffect(() => {
    loadConfiguration();
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
      <h3 style={{ margin: '0 0 20px 0', color: 'white' }}>Configuration</h3>
      
      {/* Tracking Settings */}
      <div style={{ 
        backgroundColor: '#0a0a0a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px'
      }}>
        <h4 style={{ color: 'white', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdSettings size={20} />
          Window Tracking
        </h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={trackingEnabled}
              onChange={handleToggleTracking}
              style={{ transform: 'scale(1.2)' }}
            />
            Enable window tracking
          </label>
        </div>
        
        <div style={{ 
          padding: '12px',
          backgroundColor: trackingEnabled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          borderRadius: '6px',
          border: `1px solid ${trackingEnabled ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: trackingEnabled ? '#4CAF50' : '#f44336', 
              borderRadius: '50%' 
            }}></div>
            <span style={{ 
              color: trackingEnabled ? '#4CAF50' : '#f44336', 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {trackingEnabled ? 'Tracking Active' : 'Tracking Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Idle Detection Settings */}
      <div style={{ 
        backgroundColor: '#0a0a0a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '20px'
      }}>
        <h4 style={{ color: 'white', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdCloudSync size={20} />
          Idle Detection
        </h4>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: 'white', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            Idle Threshold (minutes)
          </label>
          <input
            type="number"
            value={idleThreshold}
            onChange={(e) => handleIdleThresholdChange(Number(e.target.value))}
            min="1"
            max="30"
            style={{
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              width: '120px',
              fontSize: '14px'
            }}
          />
          <p style={{ color: '#aaa', fontSize: '12px', marginTop: '5px' }}>
            Time before user is considered idle (1-30 minutes)
          </p>
        </div>
        
        {idleStatus && (
          <div style={{ 
            padding: '12px',
            backgroundColor: idleStatus.isIdle ? 'rgba(255, 152, 0, 0.1)' : 'rgba(76, 175, 80, 0.1)',
            borderRadius: '6px',
            border: `1px solid ${idleStatus.isIdle ? 'rgba(255, 152, 0, 0.3)' : 'rgba(76, 175, 80, 0.3)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: idleStatus.isIdle ? '#FF9800' : '#4CAF50', 
                borderRadius: '50%' 
              }}></div>
              <span style={{ 
                color: idleStatus.isIdle ? '#FF9800' : '#4CAF50', 
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {idleStatus.isIdle ? 'Currently Idle' : 'Currently Active'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reset Settings */}
      <div style={{ 
        backgroundColor: '#0a0a0a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid rgba(244, 67, 54, 0.3)',
        marginBottom: '20px'
      }}>
        <h4 style={{ color: 'white', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdRefresh size={20} />
          Reset Settings
        </h4>
        
        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '15px' }}>
          Reset all categories and settings to their default values. This action cannot be undone.
        </p>
        
        <button
          onClick={handleResetSettings}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
};

export default ConfigurationPage;
