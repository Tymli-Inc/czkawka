import { IoApps } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import styles from './app-breakdown.module.css';

export default function AppBreakdown({
    selectedDate,
}: {
    selectedDate?: number;
}) {
    const [data, setData] = useState<{
        title: string;
        time: number;
        category: string;
        categoryColor: string;
    }[]>([]);


    useEffect(() => {
        async function fetchData() {
            try {
                console.log("Fetching data for selectedDate:", selectedDate);
                const response = await window.electronAPI.getTopAppsForDate(selectedDate);
                console.log("Raw response:", response);
                if (response.success) {
                    if (response.data.length > 0) {
                        // Filter out apps with less than 3 minutes (180,000ms) of screen time
                        const filteredData = response.data.filter((app: any) => app.time >= 180000);
                        setData(filteredData);
                        console.log("App breakdown data fetched successfully:", filteredData);
                    } else {
                        setData([]);
                    }
                } else {
                    console.error("Failed to fetch app breakdown data:", response.error);
                    setData([]);
                }
            } catch (error) {
                console.error("Error fetching app breakdown data:", error);
            }
        }

        fetchData();

        const interval = setInterval(() => {
            fetchData();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [selectedDate]);


    return (
        <div className={styles.appBreakdownContainer}>
            <div style={{
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.66)',
                position: 'sticky',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 20px',
                zIndex: 20,
                backdropFilter: 'blur(10px)',
            }}>
                <span style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    fontWeight: '300',
                    color: 'rgba(158, 158, 158, 0.9)',
                }}>
                    <IoApps />
                    <span style={{
                        fontSize: '10px',
                        fontWeight: '300',
                        color: 'rgba(158, 158, 158, 0.9)',
                    }}>
                        App Breakdown
                    </span>
                </span>
            </div>
            <div style={{ overflowY: 'scroll', padding: '20px', width: '100%' }}>
                {data.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '200px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '14px'
                    }}>
                        <IoApps style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                        <p>No app data available for this date</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        maxWidth: '100%'
                    }}>
                        {data.slice(0, 5).map((app, index) => {
                            const formatTime = (ms: number) => {
                                const hours = Math.floor(ms / (1000 * 60 * 60));
                                const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                                
                                if (hours > 0) {
                                    return `${hours}h ${minutes}m`;
                                }
                                return `${minutes}m`;
                            };

                            const maxTime = Math.max(...data.slice(0, 5).map(app => app.time));
                            const widthPercentage = (app.time / maxTime) * 100;

                            return (
                                <div
                                    key={`${app.title}-${index}`}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        padding: '16px',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Rank indicator */}
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        marginRight: '16px',
                                        flexShrink: 0,
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}>
                                        {index + 1}
                                    </div>

                                    {/* App info */}
                                    <div style={{
                                        position: 'relative',
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minWidth: 0
                                    }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            marginBottom: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {app.title}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            textTransform: 'capitalize'
                                        }}>
                                            {app.category}
                                        </div>
                                    </div>

                                    {/* Time display */}
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        marginLeft: '16px',
                                        flexShrink: 0
                                    }}>
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>
                                            {formatTime(app.time)}
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {((app.time / data.slice(0, 5).reduce((sum, a) => sum + a.time, 0)) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}