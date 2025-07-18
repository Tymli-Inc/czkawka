import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { MdPerson, MdSecurity, MdSettings, MdCategory, MdCenterFocusWeak } from 'react-icons/md';
import ProfilePage from './settings/ProfilePage';
import AuthPage from './settings/AuthPage';
import ConfigurationPage from './settings/ConfigurationPage';
import CategorizationPage from './settings/CategorizationPage';
import FocusModePage from './settings/FocusModePage';

const SettingsPage = () => {
  const location = useLocation();
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: MdPerson, path: '/settings/profile' },
    { id: 'auth', label: 'Authentication', icon: MdSecurity, path: '/settings/auth' },
    { id: 'config', label: 'Configuration', icon: MdSettings, path: '/settings/config' },
    { id: 'categories', label: 'Categories', icon: MdCategory, path: '/settings/categories' },
    { id: 'focus', label: 'Focus Mode', icon: MdCenterFocusWeak, path: '/settings/focus' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Settings Header */}
      <div style={{ 
        padding: '20px 20px 0 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#0d0d0d'
      }}>
        <h2 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '24px', fontWeight: '600' }}>
          Settings
        </h2>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '0' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <Link
                key={tab.id}
                to={tab.path}
                style={{
                  textDecoration: 'none',
                  padding: '12px 20px',
                  backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                  color: isActive ? '#007bff' : '#aaa',
                  borderBottom: isActive ? '2px solid #007bff' : '2px solid transparent',
                  borderTop: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  position: 'relative',
                  marginBottom: '-1px'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1, 
        backgroundColor: '#161616',
        overflow: 'auto'
      }}>
        <Routes>
          <Route path="/" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/config" element={<ConfigurationPage />} />
          <Route path="/categories" element={<CategorizationPage />} />
          <Route path="/focus" element={<FocusModePage />} />
        </Routes>
      </div>
    </div>
  );
};

export default SettingsPage;
