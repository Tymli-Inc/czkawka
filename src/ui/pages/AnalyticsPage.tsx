import React, { useEffect, useState } from 'react';
import { MdGraphicEq } from 'react-icons/md';
import { PiGraph } from 'react-icons/pi';

const AnalyticsPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [idleStats, setIdleStats] = useState<any>(null);
  const [currentIdleStatus, setCurrentIdleStatus] = useState<any>(null);
  const [idleStatsLoading, setIdleStatsLoading] = useState(true);

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

  const loadIdleData = async () => {
    try {
      setIdleStatsLoading(true);
      
      // Load idle statistics
      const statsResult = await window.electronAPI.getIdleStatistics();
      if (statsResult.success) {
        setIdleStats(statsResult.data);
      }

      // Load current idle status
      const statusResult = await window.electronAPI.getCurrentIdleStatus();
      setCurrentIdleStatus(statusResult);
      
    } catch (err) {
      console.error('Error loading idle data:', err);
    } finally {
      setIdleStatsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  useEffect(() => {
    loadUserData();
    loadIdleData();
    
    // Refresh idle status every 30 seconds
    const interval = setInterval(() => {
      if (window.electronAPI.getCurrentIdleStatus) {
        window.electronAPI.getCurrentIdleStatus().then(setCurrentIdleStatus);
      }
    }, 30000);

    return () => clearInterval(interval);
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
      <h1  style={{
        fontSize: '24px',
        height: '55px',
        lineHeight: '40px',
        paddingBottom: '20px',
        marginTop: '0',
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <PiGraph style={{ verticalAlign: 'middle', marginRight: '8px', color: 'rgba(206, 206, 206, 0.77)' }} />
        Analytics
      </h1>
      {user ? (
        <>
          <p>View your window tracking analytics and insights here.</p>
          
          {/* Current Idle Status */}
          {currentIdleStatus && (
            <div style={{
              backgroundColor: '#070707',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}>
              <h3>Current Status: {currentIdleStatus.isIdle ? 'Idle' : 'Active'}</h3>
              {currentIdleStatus.isIdle && currentIdleStatus.idleDuration > 0 && (
                <p>Idle for: {formatDuration(currentIdleStatus.idleDuration)}</p>
              )}
              {!currentIdleStatus.isIdle && (
                <p>Last active: {new Date(currentIdleStatus.lastActiveTime).toLocaleTimeString()}</p>
              )}
              <p>Idle threshold: {formatDuration(currentIdleStatus.idleThreshold)}</p>
            </div>
          )}

          {/* Idle Statistics */}
          {!idleStatsLoading && idleStats && (
            <div style={{
              backgroundColor: '#070707',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}>
              <h3>Idle Time Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <h4>Total Idle Sessions</h4>
                  <p style={{ fontSize: '24px', margin: '5px 0' }}>{idleStats.idleSessions}</p>
                </div>
                <div>
                  <h4>Total Idle Time</h4>
                  <p style={{ fontSize: '24px', margin: '5px 0' }}>{formatDuration(idleStats.totalIdleTime)}</p>
                </div>
                <div>
                  <h4>Average Idle Duration</h4>
                  <p style={{ fontSize: '24px', margin: '5px 0' }}>{formatDuration(idleStats.averageIdleDuration)}</p>
                </div>
                <div>
                  <h4>Longest Idle Session</h4>
                  <p style={{ fontSize: '24px', margin: '5px 0' }}>{formatDuration(idleStats.maxIdleDuration)}</p>
                </div>
              </div>
            </div>
          )}

          {idleStatsLoading && (
            <div style={{
              backgroundColor: '#2d3748',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p>Loading idle statistics...</p>
            </div>
          )}
        </>
      ) : (
        <p>Please log in to view your analytics.</p>
      )}
      
      <div style={{
        backgroundColor: '#070707',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}>
        <h3>Coming Soon</h3>
        <p>Advanced analytics features will be available here including:</p>
        <ul>
          <li>Daily activity charts</li>
          <li>Most used applications</li>
          <li>Productivity insights</li>
          <li>Time tracking reports</li>
          <li>Idle time trends and patterns</li>
          <li>Activity vs. idle time comparison</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsPage;
