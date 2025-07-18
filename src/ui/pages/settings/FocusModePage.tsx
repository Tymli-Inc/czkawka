import React, { useState, useEffect } from 'react';
import { MdCenterFocusWeak, MdNotifications, MdSchedule, MdWork } from 'react-icons/md';

interface FocusSettings {
  duration: number;
  jobRole: string;
  isEnabled: boolean;
  showDistractionPopup: boolean;
  autoBreakReminder: boolean;
}

const FocusModePage: React.FC = () => {
  const [settings, setSettings] = useState<FocusSettings>({
    duration: 45,
    jobRole: 'Software developer',
    isEnabled: false,
    showDistractionPopup: true,
    autoBreakReminder: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.getFocusModeSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to load focus mode settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async (newSettings: Partial<Omit<FocusSettings, 'jobRole'>>) => {
    try {
      const result = await window.electronAPI.updateFocusModeSettings(newSettings);
      if (result.success) {
        setSettings({ ...settings, ...newSettings });
      } else {
        alert(result.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div>Loading focus mode settings...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', margin: '0 auto' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Focus Mode Toggle */}
        <div style={{
          background: 'rgba(46, 46, 46, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #333'
        }}>
          <h3 style={{ 
            color: '#ffffff', 
            margin: '0 0 15px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MdCenterFocusWeak />
            Focus Mode
          </h3>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            color: '#ffffff',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e) => handleSettingsUpdate({ isEnabled: e.target.checked })}
              style={{ 
                width: '18px', 
                height: '18px',
                accentColor: '#4ecdc4'
              }}
            />
            Enable Focus Mode
          </label>
          <p style={{ color: '#b0b0b0', margin: '10px 0 0 0', fontSize: '0.9rem' }}>
            When enabled, you can start focus sessions using the focus mode page or Ctrl+Shift+F shortcut
          </p>
        </div>

        {/* Job Role */}
        <div style={{
          background: 'rgba(46, 46, 46, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #333'
        }}>
          <h3 style={{ 
            color: '#ffffff', 
            margin: '0 0 15px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MdWork />
            Job Role
          </h3>
          <div style={{ 
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            borderLeft: '4px solid #4ecdc4'
          }}>
            <p style={{ color: '#ffffff', margin: '0 0 5px 0', fontSize: '1rem' }}>
              Current Job Role: <strong>{settings.jobRole}</strong>
            </p>
            <p style={{ color: '#b0b0b0', margin: '0', fontSize: '0.9rem' }}>
              Job role is set in your questionnaire and determines which apps are considered distracting during focus sessions.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div style={{
          background: 'rgba(46, 46, 46, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #333'
        }}>
          <h3 style={{ 
            color: '#ffffff', 
            margin: '0 0 15px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MdNotifications />
            Notifications
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              color: '#ffffff',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={settings.showDistractionPopup}
                onChange={(e) => handleSettingsUpdate({ showDistractionPopup: e.target.checked })}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#4ecdc4'
                }}
              />
              Show Distraction Popup
            </label>
            <p style={{ color: '#b0b0b0', margin: '0', fontSize: '0.9rem' }}>
              Display a popup alert when you open a distracting application during focus sessions
            </p>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              color: '#ffffff',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={settings.autoBreakReminder}
                onChange={(e) => handleSettingsUpdate({ autoBreakReminder: e.target.checked })}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#4ecdc4'
                }}
              />
              Auto Break Reminder
            </label>
            <p style={{ color: '#b0b0b0', margin: '0', fontSize: '0.9rem' }}>
              Show a break reminder when your focus session ends
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut Info */}
        <div style={{
          background: 'rgba(78, 205, 196, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(78, 205, 196, 0.2)'
        }}>
          <h3 style={{ 
            color: '#4ecdc4', 
            margin: '0 0 10px 0',
            fontSize: '1.1rem'
          }}>
            💡 Quick Start Tip
          </h3>
          <p style={{ color: '#ffffff', margin: '0', fontSize: '0.9rem' }}>
            Use <kbd style={{ 
              background: '#333333',
              border: '1px solid #555555',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.8rem',
              color: '#ffffff'
            }}>Ctrl</kbd> + <kbd style={{ 
              background: '#333333',
              border: '1px solid #555555',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.8rem',
              color: '#ffffff'
            }}>Shift</kbd> + <kbd style={{ 
              background: '#333333',
              border: '1px solid #555555',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.8rem',
              color: '#ffffff'
            }}>F</kbd> to quickly start or stop focus mode from anywhere in the system
          </p>
        </div>
      </div>
    </div>
  );
};

export default FocusModePage;
