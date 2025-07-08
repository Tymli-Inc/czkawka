import React, { useEffect, useState } from 'react';
import { PiClockFill } from 'react-icons/pi';
import { IoCalendar, IoStatsChart, IoTime } from 'react-icons/io5';
import { MdDateRange } from 'react-icons/md';
import ScreentimeTimeline from '../components/screentime-timeline/screentime-timeline';

interface ScreentimeData {
  totalTime: number;
  sessionsCount: number;
  applicationsCount: number;
  averageSessionLength: number;
  longestSession: number;
  shortestSession: number;
}

interface DailyStats {
  date: string;
  totalTime: number;
  applicationsUsed: number;
  topApp: string;
  topAppTime: number;
}

const ScreentimePage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7days' | '30days' | '1year'>('today');
  const [screentimeData, setScreentimeData] = useState<ScreentimeData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topApps, setTopApps] = useState<any[]>([]);
  const [currentIdleStatus, setCurrentIdleStatus] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Date navigation functions
  const handleDateNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
      // Prevent going beyond current date
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (newDate > today) {
        return;
      }
    }
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date): string => {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
  };

  const loadUserData = async () => {
    try {
      const result = await window.electronAPI.getUserData();
      if (result.success && result.userData) {
        setUser(result.userData);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadScreentimeData = async () => {
    if (!user) return;

    try {
      let days: number;
      switch (selectedPeriod) {
        case 'today':
          days = 1;
          break;
        case '7days':
          days = 7;
          break;
        case '30days':
          days = 30;
          break;
        case '1year':
          days = 365;
          break;
      }

      // Fetch tracking times for the period
      const trackingResult = await window.electronAPI.getTrackingTimes(days);
      if (trackingResult.success && trackingResult.data) {
        const sessions = trackingResult.data.filter((session: any) => 
          session.session_end > 0 // Only completed sessions
        );

        const totalTime = sessions.reduce((sum: number, session: any) => {
          return sum + (session.session_end - session.session_start);
        }, 0);

        const sessionLengths = sessions.map((session: any) => 
          session.session_end - session.session_start
        );

        const screentimeData: ScreentimeData = {
          totalTime,
          sessionsCount: sessions.length,
          applicationsCount: 0, // Will be calculated from app data
          averageSessionLength: sessionLengths.length > 0 ? 
            sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length : 0,
          longestSession: sessionLengths.length > 0 ? Math.max(...sessionLengths) : 0,
          shortestSession: sessionLengths.length > 0 ? Math.min(...sessionLengths) : 0,
        };

        setScreentimeData(screentimeData);
      }

      // Fetch top apps for current period
      const today = new Date();
      const compileResult = await window.electronAPI.compileData(days);
      if (compileResult.success && compileResult.data) {
        setTopApps(compileResult.data.slice(0, 10)); // Top 10 apps
        
        // Update applications count
        if (screentimeData) {
          setScreentimeData(prev => prev ? {
            ...prev,
            applicationsCount: compileResult.data.length
          } : null);
        }
      }

      // Generate daily stats for the period
      if (selectedPeriod !== 'today') {
        const dailyStatsData: DailyStats[] = [];
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          const topAppsForDate = await window.electronAPI.getTopAppsForDate(date.getTime());
          if (topAppsForDate.success && topAppsForDate.data.length > 0) {
            const dayTotal = topAppsForDate.data.reduce((sum: number, app: any) => sum + app.time, 0);
            const topApp = topAppsForDate.data[0];
            
            dailyStatsData.push({
              date: date.toDateString(),
              totalTime: dayTotal,
              applicationsUsed: topAppsForDate.data.length,
              topApp: topApp.title,
              topAppTime: topApp.time
            });
          }
        }
        setDailyStats(dailyStatsData);
      }

      // Get current idle status
      const idleStatus = await window.electronAPI.getCurrentIdleStatus();
      setCurrentIdleStatus(idleStatus);

    } catch (error) {
      console.error('Error loading screentime data:', error);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      loadScreentimeData();
      
      // Auto-refresh every 3 minutes
      const interval = setInterval(loadScreentimeData, 3 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, selectedPeriod]);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{
        fontSize: '24px',
        height: '55px',
        lineHeight: '40px',
        paddingBottom: '20px',
        marginTop: '0',
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <PiClockFill style={{ verticalAlign: 'middle', marginRight: '8px', color: 'rgba(206, 206, 206, 0.77)' }} />
        Screentime
      </h1>

      {user ? (
        <>
          {/* Combined Header: Date Navigation + Period Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#070707',
            borderRadius: '8px',
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}>
            {/* Date Navigation - Left Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Only show date navigation when "Today" is selected */}
              {selectedPeriod === 'today' && (
                <button 
                  onClick={() => handleDateNavigate('prev')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  ‹
                </button>
              )}
              
              <div style={{ 
                color: '#fff',
                fontSize: '16px',
                fontWeight: '500',
                minWidth: '180px',
                textAlign: 'center'
              }}>
                {selectedPeriod === 'today' ? formatDate(selectedDate) : 
                 selectedPeriod === '7days' ? 'Last 7 Days' :
                 selectedPeriod === '30days' ? 'Last 30 Days' : 'Last Year'}
              </div>
              
              {/* Only show next button if selected date is not today and period is today */}
              {selectedPeriod === 'today' && selectedDate.toDateString() !== new Date().toDateString() && (
                <button 
                  onClick={() => handleDateNavigate('next')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  ›
                </button>
              )}
              
              {/* Invisible placeholder when next button is hidden */}
              {selectedPeriod === 'today' && selectedDate.toDateString() === new Date().toDateString() && (
                <div style={{ width: '36px', height: '36px' }} />
              )}
            </div>

            {/* Period Selector - Right Side */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['today', '7days', '30days', '1year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedPeriod === period ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: selectedPeriod === period ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPeriod !== period) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPeriod !== period) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {period === 'today' ? 'Today' : 
                   period === '7days' ? '7 Days' : 
                   period === '30days' ? '30 Days' : 'Year'}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Screen Time */}
          {dailyStats.length > 0 && selectedPeriod !== 'today' && (
            <div style={{
              backgroundColor: '#070707',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}>
              <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdDateRange />
                Daily Screen Time
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dailyStats.map((day) => (
                  <div
                    key={day.date}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: '14px' }}>
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        day: 'numeric',
                        month: 'short'
                      }).replace(/(\w+), (\w+) (\d+)/, '$1, $3 $2')}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: '500' }}>
                      {formatTime(day.totalTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Section - Only show when "Today" is selected */}
          {selectedPeriod === 'today' && (
            <div style={{
              backgroundColor: 'transparent',
              marginBottom: '20px',
            }}>
              <ScreentimeTimeline selectedDate={selectedDate} />
            </div>
          )}

        </>
      ) : (
        <div style={{
          backgroundColor: '#070707',
          padding: '40px',
          borderRadius: '8px',
          border: "1px solid rgba(255, 255, 255, 0.1)",
          textAlign: 'center'
        }}>
          <PiClockFill style={{ fontSize: '48px', color: 'rgba(255, 255, 255, 0.3)', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 12px 0', color: 'rgba(255, 255, 255, 0.8)' }}>Login Required</h3>
          <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.6)' }}>
            Please log in to view your screentime analytics and detailed usage statistics.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScreentimePage;
