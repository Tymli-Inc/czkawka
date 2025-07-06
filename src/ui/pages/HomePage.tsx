import React, { useEffect, useState } from 'react';
// import moment from 'moment';
// import Timeline from '../components/timeline/timeline';
import TimelineNew from '../components/timeline-new/timeline-new';
import type { CompileDataResponse, ActiveWindow, TimelineStatsResponse } from '../../types/electronAPI';
import CategoryGraph from '../components/category-graph/category-graph';
import AppBreakdown from '../components/app-breakdown/app-breakdown';
import Controls from '../components/controls/controls';
// import type { TrackingSession, WindowRecord, CategoryData } from '../../types/electronAPI';

const HomePage = () => {
  const [activeWindow, setActiveWindow] = useState<ActiveWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compileData, setCompileData] = useState<CompileDataResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'6hours' | '3days' | '7days'>('6hours');
  const [user, setUser] = useState<any>(null);
  const [timelineStats, setTimelineStats] = useState<any>(null);
  const [timelineStatsLoading, setTimelineStatsLoading] = useState<boolean>(false);
  
  // Timeline state management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  // const [windowRecords, setWindowRecords] = useState<WindowRecord[]>([]);
  // const [categorizedData, setCategorizedData] = useState<CategoryData[]>([]);
  // const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  // const [timelineError, setTimelineError] = useState<string | null>(null);

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
    if (user) {
      fetchCompileData(selectedFilter);
    }
  }, [selectedFilter, user]);

  // Fetch timeline stats when user or selected date changes
  useEffect(() => {
    if (user && selectedDate) {
      fetchTimelineStats(selectedDate);
    }
  }, [user, selectedDate]);

  // Timeline data fetching functions - COMMENTED OUT (not needed for TimelineNew)
  // const fetchTimelineData = async (date: Date) => {
  //   if (!user) return;
    
  //   setTimelineLoading(true);
  //   setTimelineError(null);
    
  //   try {
  //     const dayStart = new Date(date);
  //     dayStart.setHours(0, 0, 0, 0);
  //     const dayEnd = new Date(date);
  //     dayEnd.setHours(23, 59, 59, 999);
      
  //     const isToday = date.toDateString() === new Date().toDateString();

  //     console.log('Fetching data for date range:', dayStart.toISOString(), 'to', dayEnd.toISOString(), 'isToday:', isToday);

  //     // For categorized data, we need to fetch all recent data and filter by date
  //     // The API doesn't support specific date filtering, so we get recent data and filter client-side
  //     const categorizedResult = await window.electronAPI.compileData(7); // Get last 7 days
  //     if (categorizedResult.success && categorizedResult.data) {
  //       setCategorizedData(categorizedResult.data);
  //       console.log('Categorized data:', categorizedResult.data.length, 'categories');
  //     } else {
  //       setCategorizedData([]);
  //     }

  //     // Fetch all window records and filter by the selected date
  //     const windowsResult = await window.electronAPI.getActiveWindows();
  //     if (windowsResult) {
  //       const filteredWindows = windowsResult.filter((window: any) => {
  //         const windowTime = window.timestamp;
  //         return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
  //       });
        
  //       console.log('Filtered windows for', date.toDateString(), ':', filteredWindows.length, 'out of', windowsResult.length);
  //       setWindowRecords(filteredWindows);
  //     } else {
  //       setWindowRecords([]);
  //     }

  //     // Fetch tracking sessions and filter by date
  //     const sessionsResult = await window.electronAPI.getTrackingTimes(7); // Get last 7 days
  //     if (sessionsResult.success && sessionsResult.data) {
  //       const filteredSessions = sessionsResult.data.filter((session: any) => {
  //         const sessionStart = session.session_start;
  //         const sessionEnd = session.session_end || Date.now();
  //         // Check if session overlaps with the selected day
  //         return sessionStart < dayEnd.getTime() && sessionEnd > dayStart.getTime();
  //       });
        
  //       console.log('Filtered sessions for', date.toDateString(), ':', filteredSessions.length, 'out of', sessionsResult.data.length);
  //       setTrackingSessions(filteredSessions);
  //     } else {
  //       setTrackingSessions([]);
  //     }
      
  //   } catch (err) {
  //     console.error('Error fetching timeline data:', err);
  //     setTimelineError('Failed to fetch timeline data');
  //   } finally {
  //     setTimelineLoading(false);
  //   }
  // };

  // Calculate timeline statistics - COMMENTED OUT (replaced by backend getTimelineStats)
  // const calculateTimelineStats = () => {
  //   // Initialize with safe defaults
  //   const safeTrackingSessions = trackingSessions || [];
  //   const safeWindowRecords = windowRecords || [];
  //   const safeCategorizedData = categorizedData || [];

  //   const dayStart = new Date(selectedDate);
  //   dayStart.setHours(0, 0, 0, 0);
  //   const dayEnd = new Date(selectedDate);
  //   dayEnd.setHours(23, 59, 59, 999);

  //   // Calculate total active time from window records for the selected date only
  //   const totalActiveTimeFromWindows = safeWindowRecords
  //     .filter(window => {
  //       const windowTime = window.timestamp;
  //       return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
  //     })
  //     .reduce((total, window) => {
  //       return total + (window.session_length || 0);
  //     }, 0);

  //   // Alternative: Calculate from categorized data if this represents the selected date
  //   // Note: categorized data represents totals, not date-specific data
  //   const categoryActiveTime = safeCategorizedData.reduce((total, category) => {
  //     return total + (category.session_length || 0);
  //   }, 0);

  //   // For the selected date, use window records as they are date-filtered
  //   // Only use category data if we don't have window records for today
  //   let finalActiveTime = totalActiveTimeFromWindows;
    
  //   // If this is today and we have category data but no window records, use category data
  //   const isToday = selectedDate.toDateString() === new Date().toDateString();
  //   if (isToday && totalActiveTimeFromWindows === 0 && categoryActiveTime > 0) {
  //     finalActiveTime = categoryActiveTime;
  //   }

  //   // Count unique applications from date-filtered window records
  //   const uniqueApps = new Set(
  //     safeWindowRecords
  //       .filter(window => {
  //         const windowTime = window.timestamp;
  //         return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
  //       })
  //       .map(window => window.title)
  //       .filter(title => title && title.trim().length > 0)
  //   );
  //   const applicationsCount = uniqueApps.size;

  //   // Categories count (this might not be date-specific)
  //   const categoriesCount = safeCategorizedData.length;

  //   // Sessions count from date-filtered tracking sessions
  //   const dateFilteredSessions = safeTrackingSessions.filter(session => {
  //     const sessionStart = session.session_start;
  //     const sessionEnd = session.session_end || Date.now();
  //     return sessionStart < dayEnd.getTime() && sessionEnd > dayStart.getTime();
  //   });
  //   const sessionsCount = dateFilteredSessions.length;

  //   console.log('Stats calculation for', selectedDate.toDateString(), ':', {
  //     windowRecordsTime: totalActiveTimeFromWindows,
  //     categoryTime: categoryActiveTime,
  //     finalActiveTime,
  //     windowRecordsCount: safeWindowRecords.length,
  //     dateFilteredWindowsCount: safeWindowRecords.filter(w => w.timestamp >= dayStart.getTime() && w.timestamp <= dayEnd.getTime()).length,
  //     applicationsCount,
  //     categoriesCount,
  //     sessionsCount,
  //     isToday
  //   });

  //   return {
  //     totalActiveTime: finalActiveTime,
  //     sessionsCount,
  //     applicationsCount,
  //     categoriesCount
  //   };
  // };

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

  // Refresh timeline data - COMMENTED OUT (not needed for TimelineNew)
  // const handleTimelineRefresh = () => {
  //   fetchTimelineData(selectedDate);
  // };

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

  // Fetch timeline stats for the selected date
  const fetchTimelineStats = async (date: Date) => {
    if (!user) return;
    
    setTimelineStatsLoading(true);
    try {
      const response = await window.electronAPI.getTimelineStats(date.toISOString());
      if (response.success && response.data) {
        setTimelineStats(response.data);
      } else {
        console.error('Failed to fetch timeline stats:', response.error);
        setTimelineStats(null);
      }
    } catch (err) {
      console.error('Error fetching timeline stats:', err);
      setTimelineStats(null);
    } finally {
      setTimelineStatsLoading(false);
    }
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
            {timelineStatsLoading ? (
              <div style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px'
              }}>
                Loading stats...
              </div>
            ) : timelineStats ? (
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
                    {formatDuration(timelineStats.totalActiveTime)}
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
                    {timelineStats.sessionsCount}
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
                    {timelineStats.applicationsCount}
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
                    {timelineStats.categoriesCount}
                  </span>
                </div>
              </>
            ) : (
              <div style={{
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '14px'
              }}>
                No stats available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline Component - OLD TIMELINE COMMENTED OUT */}
      {/* <Timeline 
        selectedDate={selectedDate}
        trackingSessions={trackingSessions}
        windowRecords={windowRecords}
        categorizedData={categorizedData}
        loading={timelineLoading}
        error={timelineError}
        onRefresh={handleTimelineRefresh}
        onDateNavigate={handleDateNavigate}
        timelineStats={calculateTimelineStats()}
      /> */}
      
      {/* New Timeline Component */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        padding: '0 20px',
      }}>
        <div style={{
          width: '60%',
        }}>
          <TimelineNew
            selectedDate={selectedDate}
            onDateNavigate={handleDateNavigate}
            initialScrollerPosition={selectedDate.toDateString() === new Date().toDateString() ? undefined : 0}
            initialScalingFactor={2.5}
          />
        </div>
        <div style={{
          height: 'calc(100vh - 190px)',
          width: '40%',
          display: 'flex',
          gap: '20px',
          flexDirection: 'column',
          alignItems: 'center',
          marginLeft: '20px',
          backgroundColor: 'rgba(13, 13, 13, 1)',
          borderTopRightRadius: '8px',
          borderBottomRightRadius: '8px',
        }}>
          <div style={{
            height: '100%',
          }}>
            <CategoryGraph 
              selectedDate={Number(selectedDate)}
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '20px',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
          }}>
            <div style={{
              flex: 1,
            }}>
              <AppBreakdown selectedDate={Number(selectedDate)} />
            </div>
            <div style={{
              width: '300px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Controls />
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default HomePage;
