import React, { useState, useEffect } from 'react';
import FocusTimeline from '../components/focus-timeline/focus-timeline';

import { useFocus, useFocusTimer } from '../contexts/FocusContext';
import styles from './FocusMode.module.css';

interface FocusSettings {
  duration: number;
  jobRole: string;
  isEnabled: boolean;
  showDistractionPopup: boolean;
  autoBreakReminder: boolean;
}

const FocusMode: React.FC = () => {
  const { state, actions } = useFocus();
  const { timeRemaining, currentSession, formattedTime, isActive } = useFocusTimer();
  
  const {
    loading,
    settings,
    error
  } = state;

  const {
    startFocusMode,
    endFocusMode,
    updateSettings,
    clearError
  } = actions;

  // Clear errors when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  const handleStartFocus = async () => {
    const success = await startFocusMode();
    if (!success && error) {
      alert(error);
    }
  };

  const handleEndFocus = async () => {
    const success = await endFocusMode();
    if (!success && error) {
      alert(error);
    }
  };

  const handleSettingsUpdate = async (newSettings: Partial<Omit<FocusSettings, 'jobRole'>>) => {
    const success = await updateSettings(newSettings);
    if (!success && error) {
      alert(error);
    }
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
      {/* Debug components - remove these in production */}


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
                      {formattedTime}
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
                    {Math.floor(settings.duration)}:{(Math.floor((settings.duration * 60) % 60)).toString().padStart(2, '0')}
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
