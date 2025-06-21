import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/about', label: 'About', icon: 'ℹ️' }
  ];

  return (
    <div style={{
      width: '200px',
      height: '100%',
      backgroundColor: '#2a2a2a',
      borderRight: '1px solid #333',
      padding: '20px 0',
      boxSizing: 'border-box'
    }}>
      <nav>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}>
          {menuItems.map((item) => (
            <li key={item.path} style={{ marginBottom: '10px' }}>
              <Link
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  color: location.pathname === item.path ? '#007bff' : '#ccc',
                  textDecoration: 'none',
                  backgroundColor: location.pathname === item.path ? '#333' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
