import React from 'react';

const AboutPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>About Hourglass</h1>
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3>Version 0.0.2</h3>
        <p>
          Hourglass is a window tracking application built with Electron and React.
          It helps you monitor your active windows and track time spent on different applications.
        </p>
        
        <h4>Features:</h4>
        <ul>
          <li>Real-time active window tracking</li>
          <li>Session time recording</li>
          <li>Google OAuth authentication</li>
          <li>Data compilation and analysis</li>
          <li>History tracking</li>
        </ul>

        <h4>Tech Stack:</h4>
        <ul>
          <li>Electron</li>
          <li>React with TypeScript</li>
          <li>Better SQLite3</li>
          <li>Moment.js</li>
          <li>React Router</li>
        </ul>

        <p style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>
          Built by the Hourglass Team
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
