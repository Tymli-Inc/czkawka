import React from 'react';

const AnalyticsPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Analytics</h1>
      <p>View your window tracking analytics and insights here.</p>
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
