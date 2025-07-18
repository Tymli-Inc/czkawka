import React, { useState, useEffect } from 'react';
import { IoAnalytics, IoPlay, IoStop } from 'react-icons/io5';
import styles from './controls.module.css';
import { Link } from 'react-router-dom';
import { PiClockFill } from 'react-icons/pi';

export default function Controls() {
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadFocusStatus();
        setupEventListeners();
        return () => {
            window.electronAPI.removeFocusModeListeners?.();
        };
    }, []);

    const loadFocusStatus = async () => {
        try {
            const result = await window.electronAPI.getFocusModeStatus();
            if (result.success && result.data) {
                console.log('Controls: Initial focus status:', result.data);
                setIsActive(result.data.isActive);
            }
        } catch (error) {
            console.error('Failed to load focus status:', error);
        }
    };

    const setupEventListeners = () => {
        window.electronAPI.onFocusModeStarted?.(() => {
            console.log('Controls: Focus mode started');
            setIsActive(true);
        });

        window.electronAPI.onFocusModeEnded?.(() => {
            console.log('Controls: Focus mode ended');
            setIsActive(false);
        });
    };

    const handleFocusSession = async () => {
        if (loading) return;
        
        setLoading(true);
        try {
            // Check current status first to toggle focus mode properly
            const statusResult = await window.electronAPI.getFocusModeStatus();
            if (statusResult.success && statusResult.data?.isActive) {
                // If active, end it
                const result = await window.electronAPI.endFocusMode();
                if (!result.success) {
                    alert(result.message || 'Failed to end focus mode');
                }
            } else {
                // If not active, start it
                const result = await window.electronAPI.startFocusMode();
                if (!result.success) {
                    alert(result.message || 'Failed to start focus mode');
                }
            }
        } catch (error) {
            console.error('Failed to toggle focus mode:', error);
            alert('Failed to toggle focus mode');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.controlsContainer}>
            <button 
                className={`${styles.focusButton} ${isActive ? styles.active : ''}`} 
                onClick={handleFocusSession}
                disabled={loading}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '29px',
                    fontWeight: 'bold',
                    color: '#fff',
                    padding: '16px',
                }}>
                    {loading ? (
                        <div className={styles.loader} />
                    ) : isActive ? (
                        <IoStop />
                    ) : (
                        <IoPlay />
                    )}
                    <span style={{
                        marginLeft: '4px',
                        fontSize: '17px',
                        fontWeight: '300',
                        textAlign: 'left',
                        color: 'rgba(255, 255, 255, 0.9)',
                    }}>
                        {isActive ? 'End Focus' : 'Focus Session'}
                    </span>
                </div>
            </button>
            <div style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                gridTemplateRows: 'repeat(2, 1fr)',
                gap: '20px',
            }}>
                <Link to="/screentime" className={styles.link}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '8px',
                        fontSize: '29px',
                        fontWeight: 'bold',
                        color: '#fff',
                        padding: '16px',
                    }}>
                        <PiClockFill />
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '17px',
                            fontWeight: '300',
                            color: 'rgba(255, 255, 255, 0.9)',
                        }}>
                            Screentime
                        </span>
                    </div>
                </Link>
                <Link to="/analytics" className={styles.link}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '8px',
                        fontSize: '29px',
                        fontWeight: 'bold',
                        color: '#fff',
                        padding: '16px',
                    }}>
                        <IoAnalytics />
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '17px',
                            fontWeight: '300',
                            color: 'rgba(255, 255, 255, 0.9)',
                        }}>
                            Analytics
                        </span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
