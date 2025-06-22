import React, { useEffect, useState } from 'react';

const AnalyticsPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadUserData();
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
      <h1>Analytics</h1>
      {user ? (
        <>
          <p>View your window tracking analytics and insights here.</p>
        </>
      ) : (
        <p>Please log in to view your analytics.</p>
      )}
      
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3>Coming Soon</h3>
        <p>Advanced analytics features will be available here including:</p>
        <ul>
          <li>Daily activity charts</li>
          <li>Most used applications</li>
          <li>Productivity insights</li>
          <li>Time tracking reports</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsPage;
