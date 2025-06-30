import React, { useState, useEffect } from 'react';
import './timeline.css';
import { CategoryData, CompileDataResponse, WindowRecord, TrackingSession } from '../../../types/electronAPI';

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

interface TimelineProps {
  selectedDate: Date;
  trackingSessions: TrackingSession[];
  windowRecords: WindowRecord[];
  categorizedData: CategoryData[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDateNavigate: (direction: 'prev' | 'next') => void;
  timelineStats?: {
    totalActiveTime: number;
    sessionsCount: number;
    applicationsCount: number;
    categoriesCount: number;
  };
}

const Timeline: React.FC<TimelineProps> = ({
  selectedDate,
  trackingSessions,
  windowRecords,
  categorizedData,
  loading,
  error,
  onRefresh,
  onDateNavigate,
  timelineStats
}) => {
  // Keep only the Timeline-specific state
  const [sessionBars, setSessionBars] = useState<TimelineBar[]>([]);
  const [windowBars, setWindowBars] = useState<TimelineBar[]>([]);
  const [timeRange, setTimeRange] = useState({ start: 0, end: 0 });
  const [zoomLevel, setZoomLevel] = useState<'day' | '12h' | '6h' | '3h' | '1h'>('day');
  const [zoomStartTime, setZoomStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [legendStartIndex, setLegendStartIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState<'thumb' | 'left' | 'right' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, initialValue: 0 });
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
    // First check if the app belongs to a category and use category-based colors
    if (categorizedData.length > 0) {
      for (const category of categorizedData) {
        const appInCategory = category.appData.find(app => app.title === title);
        if (appInCategory) {
          return getCategoryColor(category.title);
        }
      }
    }
    
    // Fallback to hash-based color
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return windowColors[Math.abs(hash) % windowColors.length];
  };

  const getCategoryColor = (categoryName: string): string => {
    const categoryColors: { [key: string]: string } = {
      'development': '#4ECDC4',
      'social': '#FF6B6B', 
      'entertainment': '#FECA57',
      'productivity': '#45B7D1',
      'web_browsers': '#96CEB4',
      'system': '#778ca3',
      'utilities': '#54A0FF',
      'uncategorized': '#C44569'
    };
    
    return categoryColors[categoryName] || '#C44569'; // Default to purple if category not found
  };
  // Fetch data on component mount
  useEffect(() => {
    // Data is now handled by parent component
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
  }, [trackingSessions, windowRecords, categorizedData, selectedDate, zoomLevel, zoomStartTime]);

  const processTimelineData = () => {
    // Calculate time range based on zoom level
    let startTime: number;
    let endTime: number;

    if (zoomLevel === 'day') {
      // Full day view
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();
      let endOfDay: Date;
      if (selectedDate.toDateString() === now.toDateString()) {
        endOfDay = new Date(now.getTime() + 60 * 60 * 1000);
      } else {
        endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
      }
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
        startTime = zoomStartTime - duration;
        endTime = zoomStartTime;
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
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
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
  };

  const handleScrollbarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    
    const scrollbar = event.currentTarget;
    const rect = scrollbar.getBoundingClientRect();
    const scrollbarWidth = rect.width - 40; // Account for resize handles
    const clickX = event.clientX - rect.left - 20; // Account for left resize handle
    
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dayDuration = dayEnd.getTime() - dayStart.getTime();
    
    if (zoomLevel === 'day') return;
    
    const currentDuration = getZoomDuration();
    const clickPosition = Math.max(0, Math.min(clickX / scrollbarWidth, 1));
    const newStartTime = dayStart.getTime() + (clickPosition * (dayDuration - currentDuration));
    
    setZoomStartTime(newStartTime + currentDuration);
  };

  const handleDragStart = (type: 'thumb' | 'left' | 'right', event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(type);
    setDragStart({ 
      x: event.clientX, 
      initialValue: type === 'thumb' ? (zoomStartTime || 0) : getZoomDuration()
    });
  };

  const handleDragMove = (event: MouseEvent) => {
    if (!isDragging) return;
    
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dayDuration = dayEnd.getTime() - dayStart.getTime();
    
    const deltaX = event.clientX - dragStart.x;
    const scrollbarElement = document.querySelector('.timeline-scrollbar');
    if (!scrollbarElement) return;
    
    const scrollbarWidth = scrollbarElement.getBoundingClientRect().width - 40;
    const deltaTime = (deltaX / scrollbarWidth) * dayDuration;
    
    if (isDragging === 'thumb') {
      // Dragging the thumb - move the view
      const currentDuration = getZoomDuration();
      const newEndTime = Math.max(
        dayStart.getTime() + currentDuration,
        Math.min(
          dayEnd.getTime(),
          dragStart.initialValue + deltaTime
        )
      );
      setZoomStartTime(newEndTime);
    } else if (isDragging === 'left') {
      // Dragging left handle - zoom in/out
      const zoomLevels: Array<typeof zoomLevel> = ['1h', '3h', '6h', '12h', 'day'];
      const currentIndex = zoomLevels.indexOf(zoomLevel);
      const sensitivity = 50; // pixels needed to change zoom level
      
      if (deltaX < -sensitivity && currentIndex > 0) {
        handleZoomChange(zoomLevels[currentIndex - 1]);
        setDragStart({ x: event.clientX, initialValue: getZoomDuration() });
      } else if (deltaX > sensitivity && currentIndex < zoomLevels.length - 1) {
        handleZoomChange(zoomLevels[currentIndex + 1]);
        setDragStart({ x: event.clientX, initialValue: getZoomDuration() });
      }
    } else if (isDragging === 'right') {
      // Dragging right handle - zoom in/out
      const zoomLevels: Array<typeof zoomLevel> = ['1h', '3h', '6h', '12h', 'day'];
      const currentIndex = zoomLevels.indexOf(zoomLevel);
      const sensitivity = 50;
      
      if (deltaX > sensitivity && currentIndex > 0) {
        handleZoomChange(zoomLevels[currentIndex - 1]);
        setDragStart({ x: event.clientX, initialValue: getZoomDuration() });
      } else if (deltaX < -sensitivity && currentIndex < zoomLevels.length - 1) {
        handleZoomChange(zoomLevels[currentIndex + 1]);
        setDragStart({ x: event.clientX, initialValue: getZoomDuration() });
      }
    }
  };

  const handleDragEnd = () => {
    setIsDragging(null);
  };

  // Add event listeners for drag operations
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragStart]);

  const getScrollbarPosition = () => {
    if (zoomLevel === 'day') {
      return { left: 0, width: 100 };
    }
    
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dayDuration = dayEnd.getTime() - dayStart.getTime();
    
    const currentDuration = getZoomDuration();
    const viewStart = (zoomStartTime || dayStart.getTime()) - currentDuration;
    const viewEnd = zoomStartTime || dayEnd.getTime();
    
    const left = Math.max(0, ((viewStart - dayStart.getTime()) / dayDuration) * 100);
    const width = Math.min(100 - left, (currentDuration / dayDuration) * 100);
    
    return { left, width };
  };

  const getMinimapBars = () => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dayDuration = dayEnd.getTime() - dayStart.getTime();
    
    // Use all window records for the full day, not just the filtered ones
    return windowRecords
      .filter(window => {
        const windowEndTime = window.timestamp + (window.session_length || 0);
        return window.timestamp < dayEnd.getTime() && windowEndTime > dayStart.getTime();
      })
      .map(window => {
        const windowEndTime = window.timestamp + (window.session_length || 0);
        const startTime = Math.max(window.timestamp, dayStart.getTime());
        const endTime = Math.min(windowEndTime, dayEnd.getTime());
        
        const left = ((startTime - dayStart.getTime()) / dayDuration) * 100;
        const width = ((endTime - startTime) / dayDuration) * 100;
        return { 
          left, 
          width, 
          color: getWindowColor(window.title)
        };
      });
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

  const handleCategoryClick = (category: CategoryData) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
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
          <button onClick={onRefresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }  const timeMarkers = generateTimeMarkers();
  
  return (
    <div className="timeline-container" data-zoom={zoomLevel}>
      <div className="timeline-content">        <div className="timeline-header-label">
          <span>TIMELINE</span>
          <div className="timeline-header-controls">
            {/* Zoom Controls */}
            <div className="zoom-controls">
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
            <button onClick={onRefresh} className="refresh-button" title="Refresh timeline data">
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
        </div>        {/* Category Modal */}
        {isModalOpen && selectedCategory && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <div 
                    className="category-color-inline" 
                    style={{ backgroundColor: getCategoryColor(selectedCategory.title) }}
                  ></div>
                  {selectedCategory.title} Category
                </h3>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="category-stats">
                  <div className="stat">
                    <span className="stat-label">Total Time:</span>
                    <span className="stat-value">{formatDuration(selectedCategory.session_length)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Applications:</span>
                    <span className="stat-value">{selectedCategory.appData.length}</span>
                  </div>
                </div>
                <div className="apps-list">
                  <h4>Applications in this category:</h4>
                  {selectedCategory.appData.map((app, index) => (
                    <div key={index} className="app-item">
                      <div 
                        className="app-color" 
                        style={{ backgroundColor: getCategoryColor(selectedCategory.title) }}
                      ></div>
                      <span className="app-title">{app.title}</span>
                      <span className="app-time">{formatDuration(app.session_length)}</span>
                      <span className="app-percentage">
                        ({((app.session_length / selectedCategory.session_length) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Navigation Scrollbar */}
        <div className="timeline-scrollbar-container">
          <div className="timeline-scrollbar" onClick={handleScrollbarClick}>
            {/* Minimap background showing full day activity */}
            <div className="scrollbar-minimap">
              {getMinimapBars().map((bar, index) => (
                <div
                  key={index}
                  className="minimap-bar"
                  style={{
                    left: `${bar.left}%`,
                    width: `${bar.width}%`,
                    backgroundColor: bar.color,
                    opacity: 0.3
                  }}
                />
              ))}
            </div>
            
            {/* Resize handle - left (zoom in) */}
            <div 
              className="scrollbar-resize-handle left"
              onMouseDown={(e) => handleDragStart('left', e)}
              title="Drag to zoom in/out"
            >
            </div>
            
            {/* Current view indicator */}
            <div 
              className="scrollbar-thumb"
              style={{
                left: `${getScrollbarPosition().left}%`,
                width: `${getScrollbarPosition().width}%`
              }}
              onMouseDown={(e) => handleDragStart('thumb', e)}
            >
              {zoomLevel !== 'day' && zoomStartTime && (
                <div className="scrollbar-time-indicator">
                  <span>
                    {formatTime((zoomStartTime || 0) - getZoomDuration())} - {formatTime(zoomStartTime || 0)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Resize handle - right (zoom out) */}
            <div 
              className="scrollbar-resize-handle right"
              onMouseDown={(e) => handleDragStart('right', e)}
              title="Drag to zoom in/out"
            >
            </div>
          </div>
        </div>

        {sessionBars.length === 0 && windowBars.length === 0 && (
          <div className="timeline-empty">
            <p>No activity recorded for {formatDate(selectedDate)}</p>
          </div>
        )}
      </div>

      {/* Category Summary - Moved below timeline */}
      {categorizedData.length > 0 && (
        <div className="category-summary">
          <h4>Category Breakdown</h4>
          <div className="category-list">
            {categorizedData.map((category) => (
              <div 
                key={category.title} 
                className="category-item clickable"
                onClick={() => handleCategoryClick(category)}
                title="Click to view apps in this category"
              >
                <div 
                  className="category-color" 
                  style={{ backgroundColor: getCategoryColor(category.title) }}
                ></div>
                <span className="category-name">{category.title}</span>
                <span className="category-time">{formatDuration(category.session_length)}</span>
                <span className="category-apps">({category.appData.length} apps)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;