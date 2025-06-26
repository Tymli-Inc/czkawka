import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Timeline from '../components/timeline/timeline';
import type { CompileDataResponse, ActiveWindow, WindowHistoryEntry, TrackingSession, WindowRecord, CategoryData } from '../../types/electronAPI';

const HomePage = () => {
  const [activeWindow, setActiveWindow] = useState<ActiveWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<WindowHistoryEntry[]>([]);
  const [compileData, setCompileData] = useState<CompileDataResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'6hours' | '3days' | '7days'>('6hours');
  const [user, setUser] = useState<any>(null);
  
  // Timeline state management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [windowRecords, setWindowRecords] = useState<WindowRecord[]>([]);
  const [categorizedData, setCategorizedData] = useState<CategoryData[]>([]);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const refreshHistory = async () => {
    try {
      const hist = await window.electronAPI.getActiveWindows();
      setHistory(hist);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchCompileData = async (filter: '6hours' | '3days' | '7days') => {
    try {
      let days: number;
      switch (filter) {
        case '6hours':
          days = 0.25; // 6 hours = 0.25 days
          break;
        case '3days':
          days = 3;
          break;
        case '7days':
          days = 7;
          break;
      }
      
      const result = await window.electronAPI.compileData(days);
      if (result.success) {
        setCompileData(result);
      } else {
        console.error('Failed to compile data');
      }
    } catch (err) {
      console.error('Error compiling data:', err);
    }
  };

  const loadStoredUser = async () => {
    try {
      const { userData, isLoggedIn } = await window.electronAPI.getUserToken();
      if (isLoggedIn && userData) {
        console.log('Found stored user data:', userData);
        setUser(userData);
      }
    } catch (err) {
      console.error('Error loading stored user:', err);
    }
  };
  useEffect(() => {
    loadStoredUser();
  }, []);

  useEffect(() => {
    async function fetchActiveWindow() {
      try {
        const data = await window.electronAPI.getActiveWindow();
        if (data && 'error' in data) {
          console.error('Error from main process:', data.error);
          setError(String(data.error || 'Unknown error'));
          setActiveWindow(null);
        } else if (data) {
          setActiveWindow(data);
          setError(null);
        } else {
          setActiveWindow(null);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching active window:', err);
        setError('Failed to fetch active window');
        setActiveWindow(null);
      }
    }

    fetchActiveWindow();

    const interval = setInterval(fetchActiveWindow, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCompileData(selectedFilter);
    }
  }, [selectedFilter, user]);

  // Fetch timeline data when user or selected date changes
  useEffect(() => {
    if (user && selectedDate) {
      fetchTimelineData(selectedDate);
    }
  }, [user, selectedDate]);

  // Timeline data fetching functions
  const fetchTimelineData = async (date: Date) => {
    if (!user) return;
    
    setTimelineLoading(true);
    setTimelineError(null);
    
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const isToday = date.toDateString() === new Date().toDateString();

      console.log('Fetching data for date range:', dayStart.toISOString(), 'to', dayEnd.toISOString(), 'isToday:', isToday);

      // For categorized data, we need to fetch all recent data and filter by date
      // The API doesn't support specific date filtering, so we get recent data and filter client-side
      const categorizedResult = await window.electronAPI.compileData(7); // Get last 7 days
      if (categorizedResult.success && categorizedResult.data) {
        setCategorizedData(categorizedResult.data);
        console.log('Categorized data:', categorizedResult.data.length, 'categories');
      } else {
        setCategorizedData([]);
      }

      // Fetch all window records and filter by the selected date
      const windowsResult = await window.electronAPI.getActiveWindows();
      if (windowsResult) {
        const filteredWindows = windowsResult.filter((window: any) => {
          const windowTime = window.timestamp;
          return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
        });
        
        console.log('Filtered windows for', date.toDateString(), ':', filteredWindows.length, 'out of', windowsResult.length);
        setWindowRecords(filteredWindows);
      } else {
        setWindowRecords([]);
      }

      // Fetch tracking sessions and filter by date
      const sessionsResult = await window.electronAPI.getTrackingTimes(7); // Get last 7 days
      if (sessionsResult.success && sessionsResult.data) {
        const filteredSessions = sessionsResult.data.filter((session: any) => {
          const sessionStart = session.session_start;
          const sessionEnd = session.session_end || Date.now();
          // Check if session overlaps with the selected day
          return sessionStart < dayEnd.getTime() && sessionEnd > dayStart.getTime();
        });
        
        console.log('Filtered sessions for', date.toDateString(), ':', filteredSessions.length, 'out of', sessionsResult.data.length);
        setTrackingSessions(filteredSessions);
      } else {
        setTrackingSessions([]);
      }
      
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      setTimelineError('Failed to fetch timeline data');
    } finally {
      setTimelineLoading(false);
    }
  };

  // Calculate timeline statistics
  const calculateTimelineStats = () => {
    // Initialize with safe defaults
    const safeTrackingSessions = trackingSessions || [];
    const safeWindowRecords = windowRecords || [];
    const safeCategorizedData = categorizedData || [];

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Calculate total active time from window records for the selected date only
    const totalActiveTimeFromWindows = safeWindowRecords
      .filter(window => {
        const windowTime = window.timestamp;
        return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
      })
      .reduce((total, window) => {
        return total + (window.session_length || 0);
      }, 0);

    // Alternative: Calculate from categorized data if this represents the selected date
    // Note: categorized data represents totals, not date-specific data
    const categoryActiveTime = safeCategorizedData.reduce((total, category) => {
      return total + (category.session_length || 0);
    }, 0);

    // For the selected date, use window records as they are date-filtered
    // Only use category data if we don't have window records for today
    let finalActiveTime = totalActiveTimeFromWindows;
    
    // If this is today and we have category data but no window records, use category data
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (isToday && totalActiveTimeFromWindows === 0 && categoryActiveTime > 0) {
      finalActiveTime = categoryActiveTime;
    }

    // Count unique applications from date-filtered window records
    const uniqueApps = new Set(
      safeWindowRecords
        .filter(window => {
          const windowTime = window.timestamp;
          return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
        })
        .map(window => window.title)
        .filter(title => title && title.trim().length > 0)
    );
    const applicationsCount = uniqueApps.size;

    // Categories count (this might not be date-specific)
    const categoriesCount = safeCategorizedData.length;

    // Sessions count from date-filtered tracking sessions
    const dateFilteredSessions = safeTrackingSessions.filter(session => {
      const sessionStart = session.session_start;
      const sessionEnd = session.session_end || Date.now();
      return sessionStart < dayEnd.getTime() && sessionEnd > dayStart.getTime();
    });
    const sessionsCount = dateFilteredSessions.length;

    console.log('Stats calculation for', selectedDate.toDateString(), ':', {
      windowRecordsTime: totalActiveTimeFromWindows,
      categoryTime: categoryActiveTime,
      finalActiveTime,
      windowRecordsCount: safeWindowRecords.length,
      dateFilteredWindowsCount: safeWindowRecords.filter(w => w.timestamp >= dayStart.getTime() && w.timestamp <= dayEnd.getTime()).length,
      applicationsCount,
      categoriesCount,
      sessionsCount,
      isToday
    });

    return {
      totalActiveTime: finalActiveTime,
      sessionsCount,
      applicationsCount,
      categoriesCount
    };
  };

  // Date navigation functions
  const handleDateNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  // Refresh timeline data
  const handleTimelineRefresh = () => {
    fetchTimelineData(selectedDate);
  };

  // Format functions
  const formatDate = (date: Date): string => {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div>
      {/* Timeline Header with Date Navigation and Stats */}
      {user && (
        <div className="timeline-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '20px',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Date Navigation */}
          <div className="date-navigation" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button 
              onClick={() => handleDateNavigate('prev')}
              className="nav-button"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ‹
            </button>
            
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#ffffff',
              minWidth: '200px',
              textAlign: 'center'
            }}>
              {formatDate(selectedDate)}
            </h2>
            
            <button 
              onClick={() => handleDateNavigate('next')}
              className="nav-button"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ›
            </button>
          </div>

          {/* Timeline Statistics */}
          <div className="timeline-stats" style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center'
          }}>
            {(() => {
              const stats = calculateTimelineStats();
              return (
                <>
                  <div className="stat" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span className="stat-label" style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Active Time
                    </span>
                    <span className="stat-value" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#ffffff'
                    }}>
                      {formatDuration(stats.totalActiveTime)}
                    </span>
                  </div>
                  
                  <div className="stat" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span className="stat-label" style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Sessions
                    </span>
                    <span className="stat-value" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#ffffff'
                    }}>
                      {stats.sessionsCount}
                    </span>
                  </div>
                  
                  <div className="stat" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span className="stat-label" style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Applications
                    </span>
                    <span className="stat-value" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#ffffff'
                    }}>
                      {stats.applicationsCount}
                    </span>
                  </div>
                  
                  <div className="stat" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span className="stat-label" style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Categories
                    </span>
                    <span className="stat-value" style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#ffffff'
                    }}>
                      {stats.categoriesCount}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Timeline Component */}
      <Timeline 
        selectedDate={selectedDate}
        trackingSessions={trackingSessions}
        windowRecords={windowRecords}
        categorizedData={categorizedData}
        loading={timelineLoading}
        error={timelineError}
        onRefresh={handleTimelineRefresh}
        onDateNavigate={handleDateNavigate}
        timelineStats={calculateTimelineStats()}
      />
      
      {user ? (
        <div style={{ 
          marginTop: '-24px',
          padding: '20px', 
        }}>
          {activeWindow ? (            
            <div style={{
              padding: '20px', 
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'rgba(255, 255, 255, 0.5)',
                animation: 'shimmer 2s cubic-bezier(0.87, 0, 0.13, 1) infinite'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 156, 245, 1)',
                  boxShadow: '0 0 10px rgba(255, 156, 245, 0.5)',
                  marginRight: '12px',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                <h2 style={{ 
                  margin: 0, 
                  fontSize: '20px', 
                  fontWeight: '600',
                  background: 'linear-gradient(90deg, rgba(255, 156, 245, 1) 0%, rgba(165, 84, 232, 1) 31.61%, rgba(135, 125, 255, 1) 66.25%, rgba(125, 212, 255, 1) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Currently Tracking
                </h2>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'row', gap: '8px' }}>
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9E9E9E', 
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Application Title
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500',
                    wordBreak: 'break-word'
                  }}>
                    {activeWindow.title}
                  </div>
                </div>

                <div style={{
                  width: '100%',

                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9E9E9E', 
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Window ID
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontFamily: 'monospace',
                    color: '#FFB74D'
                  }}>
                    {activeWindow.id}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50',
                  marginRight: '8px',
                  animation: 'pulse 1s ease-in-out infinite'
                }} />
                <span style={{ 
                  color: '#4CAF50', 
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Automatic tracking is active (updates every second)
                </span>
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.7; transform: scale(1.1); }
                }
                @keyframes shimmer {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
            </div>
            ) : (
              <p>No active window detected (tracking will start automatically)</p>
            )}
        </div>
      ) : (
        <div style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          borderRadius: '8px',
          backgroundColor: '#000000'
        }}>
          <h2>Please Login</h2>
          <p>Please go to Settings to login with your Google account to start tracking.</p>
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default HomePage;
