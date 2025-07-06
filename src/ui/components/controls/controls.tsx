import { IoAnalytics, IoPlay } from 'react-icons/io5';
import styles from './controls.module.css';
import { Link } from 'react-router-dom';
import { PiClockFill } from 'react-icons/pi';

export default function Controls() {
    return (
        <div className={styles.controlsContainer}>
            <button className={styles.focusButton} onClick={() => alert('Focus Session not implemented yet')}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '29px',
                    fontWeight: 'bold',
                    color: '#fff',
                    padding: '16px',
                }}>
                    <IoPlay />
                    <span style={{
                        marginLeft: '4px',
                        fontSize: '17px',
                        fontWeight: '300',

                        textAlign: 'left',
                        color: 'rgba(255, 255, 255, 0.9)',
                    }}>
                        Focus Session
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
