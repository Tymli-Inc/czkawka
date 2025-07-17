import React, { useState, useEffect } from 'react';
import FocusTimeline from '../components/focus-timeline/focus-timeline';
import styles from './FocusMode.module.css';

interface FocusSettings {
  duration: number;
  jobRole: string;
  isEnabled: boolean;
  showDistractionPopup: boolean;
  autoBreakReminder: boolean;
}

interface FocusSession {
  id: number;
  startTime: number;
  endTime: number;
  duration: number;
  jobRole: string;
  isActive: boolean;
  distractionCount: number;
  createdAt: string;
}

const FocusMode: React.FC = () => {
  const [settings, setSettings] = useState<FocusSettings>({
    duration: 45,
    jobRole: 'Software developer',
    isEnabled: false,
    showDistractionPopup: true,
    autoBreakReminder: true
  });
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    loadFocusModeData();
    setupEventListeners();
    return () => {
      window.electronAPI.removeFocusModeListeners();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && currentSession) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - currentSession.startTime;
        const remaining = Math.max(0, currentSession.duration - elapsed);
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          setIsActive(false);
          setCurrentSession(null);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, currentSession]);

  const loadFocusModeData = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        window.electronAPI.getFocusModeSettings(),
        window.electronAPI.getFocusModeStatus()
      ]);

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }

      if (statusRes.success && statusRes.data) {
        setIsActive(statusRes.data.isActive);
        setCurrentSession(statusRes.data.session);
        if (statusRes.data.session) {
          const now = Date.now();
          const elapsed = now - statusRes.data.session.startTime;
          const remaining = Math.max(0, statusRes.data.session.duration - elapsed);
          setTimeRemaining(remaining);
        }
      }
    } catch (error) {
      console.error('Failed to load focus mode data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupEventListeners = () => {
    window.electronAPI.onFocusModeStarted((data) => {
      setIsActive(true);
      setCurrentSession(data.session);
      setTimeRemaining(data.session.duration);
    });

    window.electronAPI.onFocusModeEnded((data) => {
      setIsActive(false);
      setCurrentSession(null);
      setTimeRemaining(0);
      loadFocusModeData(); // Refresh history
    });

    window.electronAPI.onFocusDistraction((data) => {
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          distractionCount: data.distractionCount
        });
      }
    });

    window.electronAPI.onFocusSettingsUpdated((newSettings) => {
      setSettings(newSettings);
    });
  };

  const handleStartFocus = async () => {
    try {
      const result = await window.electronAPI.startFocusMode();
      if (!result.success) {
        alert(result.message || 'Failed to start focus mode');
      }
    } catch (error) {
      console.error('Failed to start focus mode:', error);
    }
  };

  const handleEndFocus = async () => {
    try {
      const result = await window.electronAPI.endFocusMode();
      if (!result.success) {
        alert(result.message || 'Failed to end focus mode');
      }
    } catch (error) {
      console.error('Failed to end focus mode:', error);
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

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading Focus Mode...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>

      <div className={styles.mainContent}>
        {/* Left Side - Timer */}
        <div className={styles.timerSection}>
          {/* Current Session Timer */}
          {isActive && currentSession && (
            <div className={styles.activeSession}>
              <div className={styles.circularTimer}>
                <div className={styles.timerCircle}>
                  <svg className={styles.progressRing} viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 90}`}
                      strokeDashoffset={`${2 * Math.PI * 90 * (timeRemaining / currentSession.duration)}`}
                      style={{
                        transition: 'stroke-dashoffset 1s ease-in-out',
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center'
                      }}
                    />
                  </svg>
                  
                  <div className={styles.timerContent}>
                    <div className={styles.timeDisplay}>
                      {formatTime(timeRemaining)}
                    </div>
                    <div className={styles.timeLabel}>------</div>
                    <button 
                      className={styles.endSessionButton}
                      onClick={handleEndFocus}
                    >
                      End Session
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
          )}

          {!isActive && (
            <div className={styles.startSection}>
              <div className={styles.startCircle}>
                <div className={styles.startContent}>
                  <div className={styles.durationDisplay}>
                    {formatTime(settings.duration * 60 * 1000)}
                  </div>
                  <div className={styles.durationLabel}>-----</div>
                  <button 
                    className={styles.startButton}
                    onClick={handleStartFocus}
                  >
                    Focus Mode
                  </button>
                </div>
              </div>
              
            </div>
          )}
        </div>

        {/* Right Side - Timeline */}
        <div className={styles.timelineSection}>
          <div className={styles.timelineWrapper}>
            <FocusTimeline 
              selectedDate={new Date()}
              onDateNavigate={(direction: 'prev' | 'next') => {
                // Handle date navigation if needed
                console.log('Navigate:', direction);
              }}
              initialScalingFactor={1}
              initialScrollerPosition={0}
              onTimelineReady={(methods: { moveToTime: (hour: number, minute?: number) => void }) => {
                // Can use methods.moveToTime(hour, minute) if needed
                console.log('Timeline ready');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
