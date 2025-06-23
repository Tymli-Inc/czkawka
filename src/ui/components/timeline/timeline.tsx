import React, { useState, useEffect } from 'react';
import './timeline.css';

interface TrackingSession {
  id: number;
  session_start: number;
  session_end: number;
}

interface WindowRecord {
  id: number;
  title: string;
  unique_id: number;
  timestamp: number;
  session_length: number;
}

interface TimelineBar {
  id: string;
  startTime: number;
  endTime: number;
  type: 'session' | 'window';
  title?: string;
  color?: string;
}

interface TimeMarker {
  time: number;
  label: string;
  position: number;
}

const Timeline: React.FC = () => {
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [windowRecords, setWindowRecords] = useState<WindowRecord[]>([]);
  const [sessionBars, setSessionBars] = useState<TimelineBar[]>([]);
  const [windowBars, setWindowBars] = useState<TimelineBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({ start: 0, end: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<'day' | '12h' | '6h' | '3h' | '1h'>('day');  const [zoomStartTime, setZoomStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [legendStartIndex, setLegendStartIndex] = useState(0);
  // Generate colors for different windows - enhanced palette with more unique colors
  const windowColors = [
    '#FF6B6B', 
    '#4ECDC4', 
    '#45B7D1', 
    '#96CEB4', 
    '#FECA57', 
    '#FF9FF3', 
    '#54A0FF', 
    '#5F27CD', 
    '#00D2D3', 
    '#FF9F43', 
    '#10AC84', 
    '#EE5A6F', 
    '#C44569', 
    '#F8B500', 
    '#6C5CE7', 
    '#A3CB38', 
    '#FDA7DF', 
    '#12CBC4', 
    '#ED4C67', 
    '#F79F1F', 
    '#5758BB', 
    '#26de81', 
    '#fc5c65', 
    '#fd9644', 
    '#fed330', 
    '#2bcbba', 
    '#eb3b5a', 
    '#fa8231', 
    '#f7b731', 
    '#20bf6b', 
    '#3867d6', 
    '#8854d0', 
    '#2d98da', 
    '#a55eea', 
    '#778ca3', 
    '#4b6584', 
    '#f8b500', 
    '#e55039', 
    '#3c40c6', 
    '#05c46b', 
    '#ffc048', 
    '#ff3838', 
    '#ff6348', 
    '#1e3799', 
    '#38ada9'  
  ];

  const getWindowColor = (title: string): string => {
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return windowColors[Math.abs(hash) % windowColors.length];
  };
  // Fetch data on component mount
  useEffect(() => {
    fetchTimelineData();
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);
  // Process data when either dataset changes
  useEffect(() => {
    processTimelineData();
    // Reset legend pagination when data changes
    setLegendStartIndex(0);
  }, [trackingSessions, windowRecords, selectedDate, zoomLevel, zoomStartTime]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tracking sessions for the past 1 day
      const trackingResponse = await window.electronAPI.getTrackingTimes(1);
      if (trackingResponse.success) {
        setTrackingSessions(trackingResponse.data);
      } else {
        throw new Error(trackingResponse.error || 'Failed to fetch tracking times');
      }

      // Fetch window records
      const windowsResponse = await window.electronAPI.getActiveWindows();
      // Filter windows for the past 1 day
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentWindows = windowsResponse.filter(window => window.timestamp >= oneDayAgo);
      setWindowRecords(recentWindows);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };  const processTimelineData = () => {
    // Calculate time range based on zoom level
    let startTime: number;
    let endTime: number;

    if (zoomLevel === 'day') {
      // Full day view
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      startTime = startOfDay.getTime();
      endTime = endOfDay.getTime();
    } else {
      // Zoomed view - use zoomStartTime as reference point
      const zoomDuration = {
        '12h': 12 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '3h': 3 * 60 * 60 * 1000,
        '1h': 1 * 60 * 60 * 1000
      };

      const duration = zoomDuration[zoomLevel];
      
      if (zoomStartTime !== null) {
        startTime = zoomStartTime;
        endTime = zoomStartTime + duration;
      } else {
        // Default to current time if no zoom start time set
        const now = Date.now();
        endTime = now;
        startTime = now - duration;
      }

      // Ensure we don't go outside the selected day
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      startTime = Math.max(startTime, dayStart.getTime());
      endTime = Math.min(endTime, dayEnd.getTime());
    }
    
    setTimeRange({ start: startTime, end: endTime });

    // Process window records into colored bars first
    const windows: TimelineBar[] = windowRecords
      .filter(window => {
        const windowEndTime = window.timestamp + (window.session_length || 0);
        return window.timestamp < endTime && windowEndTime > startTime;
      })
      .map(window => {
        const windowEndTime = window.timestamp + (window.session_length || 0);
        return {
          id: `window-${window.id}`,
          startTime: Math.max(window.timestamp, startTime),
          endTime: Math.min(windowEndTime, endTime),
          type: 'window' as const,
          title: window.title,
          color: getWindowColor(window.title)
        };
      })
      .filter(window => window.endTime > window.startTime);

    setWindowBars(windows);

    // Create combined session bars from both tracking sessions and window data
    const rawSessions = trackingSessions
      .filter(session => session.session_start && session.session_end)
      .filter(session => {
        return session.session_start < endTime && session.session_end > startTime;
      })
      .map(session => ({
        start: Math.max(session.session_start, startTime),
        end: Math.min(session.session_end, endTime)
      }))
      .filter(session => session.end > session.start);

    // Add window intervals to fill gaps in sessions
    const windowIntervals = windows.map(window => ({
      start: window.startTime,
      end: window.endTime
    }));

    // Combine all intervals
    const allIntervals = [...rawSessions, ...windowIntervals];

    if (allIntervals.length === 0) {
      setSessionBars([]);
      return;
    }

    // Sort and merge overlapping intervals
    allIntervals.sort((a, b) => a.start - b.start);
    const mergedIntervals: Array<{ start: number; end: number }> = [];
    let current = allIntervals[0];

    for (let i = 1; i < allIntervals.length; i++) {
      const next = allIntervals[i];
      
      if (next.start <= current.end) {
        // Overlapping intervals - merge them
        current.end = Math.max(current.end, next.end);
      } else {
        // Non-overlapping - add current to result and move to next
        mergedIntervals.push(current);
        current = next;
      }
    }
    
    // Add the last interval
    mergedIntervals.push(current);

    // Convert merged intervals to session bars
    const combinedSessions: TimelineBar[] = mergedIntervals.map((interval, index) => ({
      id: `combined-session-${index}`,
      startTime: interval.start,
      endTime: interval.end,
      type: 'session' as const
    }));

    setSessionBars(combinedSessions);
  };
  const generateTimeMarkers = (): TimeMarker[] => {
    const markers = [];
    const { start, end } = timeRange;
    const duration = end - start;
    
    let interval: number;
    let formatType: 'hour' | 'minute';
    
    // Determine marker interval based on zoom level
    if (zoomLevel === 'day') {
      interval = 60 * 60 * 1000; // 1 hour
      formatType = 'hour';
    } else if (zoomLevel === '12h') {
      interval = 60 * 60 * 1000; // 1 hour
      formatType = 'hour';
    } else if (zoomLevel === '6h') {
      interval = 30 * 60 * 1000; // 30 minutes
      formatType = 'minute';
    } else if (zoomLevel === '3h') {
      interval = 15 * 60 * 1000; // 15 minutes
      formatType = 'minute';
    } else { // 1h
      interval = 10 * 60 * 1000; // 10 minutes
      formatType = 'minute';
    }
    
    // Round start time to nearest interval
    const startRounded = Math.ceil(start / interval) * interval;
    
    for (let time = startRounded; time <= end; time += interval) {
      const date = new Date(time);
      let label: string;
      
      if (formatType === 'hour') {
        const hour = date.getHours();
        label = `${hour.toString().padStart(2, '0')}:00`;
      } else {
        const hour = date.getHours();
        const minute = date.getMinutes();
        label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      
      markers.push({
        time,
        label,
        position: ((time - start) / (end - start)) * 100
      });
    }
    
    return markers;
  };

  const getBarPosition = (startTime: number, endTime: number) => {
    const { start, end } = timeRange;
    const totalDuration = end - start;
    
    const left = ((startTime - start) / totalDuration) * 100;
    const width = ((endTime - startTime) / totalDuration) * 100;
    
    return { 
      left: `${Math.max(0, Math.min(left, 100))}%`, 
      width: `${Math.max(0, Math.min(width, 100 - Math.max(0, left)))}%` 
    };
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 1000) return '< 1s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };  const getCurrentTimePosition = (): number | null => {
    const { start, end } = timeRange;
    
    // Only show current time pointer if "now" is within the visible time range
    if (currentTime >= start && currentTime <= end) {
      return ((currentTime - start) / (end - start)) * 100;
    }
    
    return null;
  };

  const isCurrentDateToday = (): boolean => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const getZoomDuration = (): number => {
    const zoomDuration = {
      'day': 24 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '1h': 1 * 60 * 60 * 1000
    };
    return zoomDuration[zoomLevel];
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
    // Reset zoom when changing dates
    setZoomLevel('day');
    setZoomStartTime(null);
  };

  const handleZoomChange = (newZoomLevel: typeof zoomLevel) => {
    if (newZoomLevel === 'day') {
      setZoomLevel('day');
      setZoomStartTime(null);
    } else {
      setZoomLevel(newZoomLevel);
      // If no zoom start time set, default to current time or middle of day
      if (zoomStartTime === null) {
        const now = Date.now();
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Use current time if it's within the selected day, otherwise use noon
        if (now >= dayStart.getTime() && now <= dayEnd.getTime()) {
          setZoomStartTime(now);
        } else {
          const noon = new Date(selectedDate);
          noon.setHours(12, 0, 0, 0);
          setZoomStartTime(noon.getTime());
        }
      }
    }
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel === 'day') {
      // Only allow zooming when in day view
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const timelineWidth = rect.width;
      const clickPosition = clickX / timelineWidth;
      
      const { start, end } = timeRange;
      const clickedTime = start + (end - start) * clickPosition;
      
      setZoomStartTime(clickedTime);
      setZoomLevel('6h'); // Default zoom level
    }
  };

  const navigateZoom = (direction: 'prev' | 'next') => {
    if (zoomStartTime === null || zoomLevel === 'day') return;
    
    const zoomDuration = {
      '12h': 12 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '1h': 1 * 60 * 60 * 1000
    };
    
    const duration = zoomDuration[zoomLevel];
    const step = duration * 0.5; // Move by half the current view
    
    const newStartTime = direction === 'next' 
      ? zoomStartTime + step 
      : zoomStartTime - step;
    
    // Ensure we don't go outside the selected day
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const clampedStartTime = Math.max(
      dayStart.getTime(), 
      Math.min(newStartTime, dayEnd.getTime() - duration)
    );
      setZoomStartTime(clampedStartTime);
  };  const navigateLegend = (direction: 'prev' | 'next') => {
    const uniqueApps = Array.from(new Set(windowBars.map(bar => bar.title)));
    const maxItemsVisible = 8; // 2 rows × 4 items per row
    // calculate total pages and max start index
    const pageCount = Math.ceil(uniqueApps.length / maxItemsVisible);
    const maxPossibleIndex = (pageCount - 1) * maxItemsVisible;
    
    if (direction === 'next') {
      const newIndex = Math.min(legendStartIndex + maxItemsVisible, maxPossibleIndex);
      setLegendStartIndex(newIndex);
    } else {
      const newIndex = Math.max(legendStartIndex - maxItemsVisible, 0);
      setLegendStartIndex(newIndex);
    }
  };

  if (loading) {
    return (
      <div className="timeline-container">
        <div className="timeline-header">
          <h2>Activity Timeline</h2>
        </div>
        <div className="timeline-loading">
          <div className="loading-spinner"></div>
          <p>Loading timeline data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-container">
        <div className="timeline-header">
          <h2>Activity Timeline</h2>
        </div>
        <div className="timeline-error">
          <p>Error: {error}</p>
          <button onClick={fetchTimelineData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }  const timeMarkers = generateTimeMarkers();
  
  // Calculate combined active time - now just sum the session bars since they already represent merged intervals
  const totalCombinedActiveTime = sessionBars.reduce((total, bar) => total + (bar.endTime - bar.startTime), 0);
  const totalSessionTime = sessionBars.reduce((total, bar) => total + (bar.endTime - bar.startTime), 0);
  const totalWindowTime = windowBars.reduce((total, bar) => total + (bar.endTime - bar.startTime), 0);
  const uniqueApplications = Array.from(new Set(windowBars.map(bar => bar.title))).length;

  return (
    <div className="timeline-container">      <div className="timeline-header">
        <div className="date-navigation">
          <button onClick={() => navigateDate('prev')} className="nav-button">
            ←
          </button>
          <h2>{formatDate(selectedDate)}</h2>
          <button onClick={() => navigateDate('next')} className="nav-button">
            →
          </button>
        </div><div className="timeline-stats">
          <div className="stat">
            <span className="stat-label">Active Time:</span>
            <span className="stat-value">{formatDuration(totalCombinedActiveTime)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Sessions:</span>
            <span className="stat-value">{sessionBars.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Applications:</span>
            <span className="stat-value">{uniqueApplications}</span>
          </div>
        </div>
      </div>      <div className="timeline-content">        <div className="timeline-header-label">
          <span>TIMELINE</span>
          <div className="timeline-header-controls">
            {/* Zoom Controls */}
            <div className="zoom-controls">
            {zoomLevel !== 'day' && (
              <div className="zoom-navigation">
                <button onClick={() => navigateZoom('prev')} className="zoom-nav-button">
                  ‹
                </button>
                <button onClick={() => navigateZoom('next')} className="zoom-nav-button">
                  ›
                </button>
              </div>
            )}
              
            {zoomLevel !== 'day' && zoomStartTime && (
              <div className="zoom-indicator">
                <div className="zoom-indicator-icon">🔍</div>
                <span>
                  {formatTime(zoomStartTime)} - {formatTime(zoomStartTime + getZoomDuration())}
                </span>
              </div>
            )}
              <div className="zoom-buttons">
                <button 
                  onClick={() => handleZoomChange('day')} 
                  className={`zoom-button ${zoomLevel === 'day' ? 'active' : ''}`}
                >
                  Day
                </button>
                <button 
                  onClick={() => handleZoomChange('12h')} 
                  className={`zoom-button ${zoomLevel === '12h' ? 'active' : ''}`}
                >
                  12h
                </button>
                <button 
                  onClick={() => handleZoomChange('6h')} 
                  className={`zoom-button ${zoomLevel === '6h' ? 'active' : ''}`}
                >
                  6h
                </button>
                <button 
                  onClick={() => handleZoomChange('3h')} 
                  className={`zoom-button ${zoomLevel === '3h' ? 'active' : ''}`}
                >
                  3h
                </button>
                <button 
                  onClick={() => handleZoomChange('1h')} 
                  className={`zoom-button ${zoomLevel === '1h' ? 'active' : ''}`}
                >
                  1h
                </button>
              </div>

            </div>
            <button onClick={fetchTimelineData} className="refresh-button" title="Refresh timeline data">
              <span>↻</span>
            </button>
          </div>
        </div>
        
        {/* Time markers */}
        <div className="time-markers">
          {timeMarkers.map(marker => (
            <div 
              key={marker.time} 
              className="time-marker"
              style={{ left: `${marker.position}%` }}
            >
              <span className="time-label">{marker.label}</span>
            </div>
          ))}
        </div>        {/* Main timeline area */}
        <div 
          className="timeline-bars"
          data-zoom={zoomLevel === 'day' ? 'zoomable' : 'zoomed'}
          onClick={handleTimelineClick}
        >
          {/* Background grid */}
          <div className="timeline-grid">
            {timeMarkers.map(marker => (
              <div 
                key={`grid-${marker.time}`}
                className="grid-line"
                style={{ left: `${marker.position}%` }}
              />
            ))}
          </div>          {/* Session bars (background) */}
          <div className="session-layer">
            {sessionBars.map(bar => {
              const position = getBarPosition(bar.startTime, bar.endTime);
              return (
                <div
                  key={bar.id}
                  className="session-bar"
                  style={position}
                  title={`Active Period: ${formatTime(bar.startTime)} - ${formatTime(bar.endTime)} (${formatDuration(bar.endTime - bar.startTime)})`}
                />
              );
            })}
          </div>{/* Window bars (foreground) */}
          <div className="window-layer">
            {windowBars.map(bar => {
              const position = getBarPosition(bar.startTime, bar.endTime);
              return (
                <div
                  key={bar.id}
                  className="window-bar"
                  style={{
                    ...position,
                    backgroundColor: bar.color
                  }}
                  title={`${bar.title}: ${formatTime(bar.startTime)} - ${formatTime(bar.endTime)} (${formatDuration(bar.endTime - bar.startTime)})`}
                />
              );
            })}
          </div>          
          {/* Current time pointer */}
          {isCurrentDateToday() && getCurrentTimePosition() !== null && (
            <div 
              className="current-time-pointer animate"
              style={{ left: `${getCurrentTimePosition()}%` }}
              title={`Current time: ${formatTime(currentTime)}`}
            />
          )}
        </div>        {/* Legend */}
        {windowBars.length > 0 && (
          <div className="timeline-legend">
            <div className="legend-header">
              <h4>Active Applications</h4>              {(() => {
                const uniqueApps = Array.from(new Set(windowBars.map(bar => bar.title)));
                const maxItemsVisible = 8; // 2 rows × 4 items per row
                const pageCount = Math.ceil(uniqueApps.length / maxItemsVisible);
                const currentPage = Math.floor(legendStartIndex / maxItemsVisible) + 1;
                const maxPossibleIndex = (pageCount - 1) * maxItemsVisible;
                const canNavigatePrev = currentPage > 1;
                const canNavigateNext = currentPage < pageCount;
                
                return (uniqueApps.length > maxItemsVisible) && (
                  <div className="legend-navigation">
                    <button 
                      onClick={() => navigateLegend('prev')} 
                      className={`legend-nav-button ${!canNavigatePrev ? 'disabled' : ''}`}
                      disabled={!canNavigatePrev}
                    >
                      ‹
                    </button>
                    <span className="legend-page-indicator">
                      {currentPage} / {pageCount}
                    </span>
                    <button 
                      onClick={() => navigateLegend('next')} 
                      className={`legend-nav-button ${!canNavigateNext ? 'disabled' : ''}`}
                      disabled={!canNavigateNext}
                    >
                      ›
                    </button>
                  </div>
                );
              })()}
            </div>
            <div className="legend-items">              {(() => {
                const uniqueApps = Array.from(new Set(windowBars.map(bar => bar.title)));
                const maxItemsVisible = 8; // 2 rows × 4 items per row
                const visibleApps = uniqueApps.slice(legendStartIndex, legendStartIndex + maxItemsVisible);
                
                return visibleApps.map(title => {
                  const color = getWindowColor(title || '');
                  const totalTime = windowBars
                    .filter(bar => bar.title === title)
                    .reduce((sum, bar) => sum + (bar.endTime - bar.startTime), 0);
                  
                  return (
                    <div key={title} className="legend-item">
                      <div 
                        className="legend-color" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="legend-title">{title}</span>
                      <span className="legend-duration">{formatDuration(totalTime)}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {sessionBars.length === 0 && windowBars.length === 0 && (
          <div className="timeline-empty">
            <p>No activity recorded for {formatDate(selectedDate)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;