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
                        setData(response.data);
                        console.log("App breakdown data fetched successfully:", response.data);
                    } else {
                        // Use mock data when no real data exists
                        const mockData = [
                            {
                                title: "Visual Studio Code",
                                time: 3600000, // 1 hour in milliseconds
                                category: "development",
                                categoryColor: "#A554E8"
                            },
                            {
                                title: "Google Chrome",
                                time: 2400000, // 40 minutes
                                category: "browsers",
                                categoryColor: "#D178F0"
                            },
                            {
                                title: "Discord",
                                time: 1800000, // 30 minutes
                                category: "social",
                                categoryColor: "#FF9CF5"
                            },
                            {
                                title: "Spotify",
                                time: 1200000, // 20 minutes
                                category: "entertainment",
                                categoryColor: "#7DD4FF"
                            },
                            {
                                title: "Notepad",
                                time: 600000, // 10 minutes
                                category: "productivity",
                                categoryColor: "#877DFF"
                            }
                        ];
                        console.log("Using mock data for testing:", mockData);
                        setData(mockData);
                    }
                } else {
                    console.error("Failed to fetch app breakdown data:", response.error);
                    
                    // For testing purposes, let's add some mock data if there's an error
                    const mockData = [
                        {
                            title: "Visual Studio Code",
                            time: 3600000, // 1 hour in milliseconds
                            category: "development",
                            categoryColor: "#A554E8"
                        },
                        {
                            title: "Google Chrome",
                            time: 2400000, // 40 minutes
                            category: "browsers",
                            categoryColor: "#D178F0"
                        },
                        {
                            title: "Discord",
                            time: 1800000, // 30 minutes
                            category: "social",
                            categoryColor: "#FF9CF5"
                        },
                        {
                            title: "Spotify",
                            time: 1200000, // 20 minutes
                            category: "entertainment",
                            categoryColor: "#7DD4FF"
                        },
                        {
                            title: "Notepad",
                            time: 600000, // 10 minutes
                            category: "productivity",
                            categoryColor: "#877DFF"
                        }
                    ];
                    console.log("Using mock data due to error:", mockData);
                    setData(mockData);
                }
            } catch (error) {
                console.error("Error fetching app breakdown data:", error);
            }
        }

        fetchData();
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