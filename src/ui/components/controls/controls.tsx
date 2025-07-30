import React, { useState, useEffect } from 'react';
import { IoAnalytics, IoPlay, IoStop } from 'react-icons/io5';
import styles from './controls.module.css';
import { Link } from 'react-router-dom';
import { PiClockFill } from 'react-icons/pi';
import { useFocusToggle } from '../../contexts/FocusContext';

export default function Controls() {
    const { isActive, loading, toggle, error, clearError } = useFocusToggle();

    // Clear any errors when component mounts
    useEffect(() => {
        if (error) {
            clearError();
        }
    }, []);

    const handleFocusSession = async () => {
        const success = await toggle();
        if (!success && error) {
            alert(error);
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
