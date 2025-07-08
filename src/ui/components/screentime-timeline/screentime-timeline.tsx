import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import styles from "./screentime-timeline.module.css"; 
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaTimeline } from "react-icons/fa6";
import { IoApps } from "react-icons/io5";

interface ScreentimeTimelineProps {
  selectedDate: Date;
}

interface AppUsageData {
  title: string;
  time: number;
  category: string;
  categoryColor: string;
}

export default function ScreentimeTimeline({ selectedDate }: ScreentimeTimelineProps): React.JSX.Element {
  // Refs and state for timeline functionality
  const boxRef = useRef<HTMLDivElement>(null);
  const timelineBaseRef = useRef<HTMLDivElement>(null);
  const [timelineHeight, setTimelineHeight] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Scrolling and interaction state
  const [height, setHeight] = useState(200);
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, startPos: 0, startHeight: 0 });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Data state
  const [topApps, setTopApps] = useState<AppUsageData[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [windowRecords, setWindowRecords] = useState<Array<{
    title: string;
    timestamp: number;
    session_length: number;
  }>>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dynamic scaling factor based on timeline height and current viewport height
  const [scalingFactor, setScalingFactor] = useState(2.5);

  // Calculate day boundaries
  const dayStart = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [selectedDate]);

  const dayEnd = useMemo(() => {
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [selectedDate]);

  // Fetch app usage data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get top apps for the selected date
        const response = await window.electronAPI.getTopAppsForDate(selectedDate.getTime());
        if (response.success && response.data.length > 0) {
          // Filter out apps with less than 3 minutes (180,000ms) of total screen time
          const filteredApps = response.data.filter((app: AppUsageData) => app.time >= 180000);
          setTopApps(filteredApps);
          // Auto-select the most used app if none selected
          if (!selectedApp && filteredApps.length > 0) {
            setSelectedApp(filteredApps[0].title);
          }
        }

        // Get all window records for the selected date
        const windowsResult = await window.electronAPI.getActiveWindows();
        if (windowsResult) {
          const filteredWindows = windowsResult.filter((window: {
            timestamp: number;
            title: string;
            session_length: number;
          }) => {
            const windowTime = window.timestamp;
            return windowTime >= dayStart.getTime() && windowTime <= dayEnd.getTime();
          });
          setWindowRecords(filteredWindows);
        }
      } catch (error) {
        console.error('Error fetching screentime data:', error);
      }
    };

    fetchData();
    
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate, dayStart, dayEnd, selectedApp]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize timeline height
  useEffect(() => {
    if (timelineBaseRef.current && !isInitialized) {
      const containerHeight = timelineBaseRef.current.getBoundingClientRect().height;
      setTimelineHeight(containerHeight);
      setIsInitialized(true);
      
      // Set initial position to current time if viewing today
      if (selectedDate.toDateString() === new Date().toDateString()) {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const currentTimePos = (hours * 60 + minutes) / (24 * 60);
        const targetPixelPos = currentTimePos * containerHeight;
        const newPosition = Math.max(0, Math.min(targetPixelPos - height / 2, containerHeight - height));
        setPosition(newPosition);
      }
    }
  }, [isInitialized, selectedDate, currentTime, height]);

  // Update scaling factor whenever height changes (including manual resizing)
  useEffect(() => {
    if (timelineHeight > 0 && height > 0) {
      const newScalingFactor = timelineHeight / height;
      setScalingFactor(newScalingFactor);
    }
  }, [timelineHeight, height]);

  // Get current time position as percentage of the day
  const getCurrentTimePosition = (): number => {
    if (selectedDate.toDateString() !== new Date().toDateString()) return -1;
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    return (hours * 60 + minutes + seconds / 60) / (24 * 60);
  };

  // Filter window records for selected app
  const selectedAppRecords = useMemo(() => {
    if (!selectedApp || !windowRecords.length) return [];
    return windowRecords.filter(record => record.title === selectedApp);
  }, [windowRecords, selectedApp]);

  // Generate timeline items for selected app
  const generateTimelineItems = () => {
    if (!selectedAppRecords.length || !timelineHeight) return [];

    // First, filter out sessions less than 1 minute (60000ms)
    const filteredRecords = selectedAppRecords.filter(record => 
      record.session_length >= 60000 // 1 minute minimum
    );

    if (filteredRecords.length === 0) return [];

    // Sort records by timestamp
    const sortedRecords = [...filteredRecords].sort((a, b) => a.timestamp - b.timestamp);

    // Merge sessions with gaps ≤ 3 minutes (180000ms)
    const mergedSessions: Array<{
      startTime: Date;
      endTime: Date;
      totalDuration: number;
      sessions: typeof sortedRecords;
    }> = [];

    let currentGroup = {
      startTime: new Date(sortedRecords[0].timestamp),
      endTime: new Date(sortedRecords[0].timestamp + sortedRecords[0].session_length),
      totalDuration: sortedRecords[0].session_length,
      sessions: [sortedRecords[0]]
    };

    for (let i = 1; i < sortedRecords.length; i++) {
      const currentRecord = sortedRecords[i];
      const currentRecordStart = new Date(currentRecord.timestamp);
      const currentRecordEnd = new Date(currentRecord.timestamp + currentRecord.session_length);
      
      // Check gap between current group end and this record start
      const gap = currentRecordStart.getTime() - currentGroup.endTime.getTime();
      
      if (gap <= 180000) { // 3 minutes or less
        // Merge with current group
        currentGroup.endTime = currentRecordEnd;
        currentGroup.totalDuration += currentRecord.session_length + gap; // Include the gap time
        currentGroup.sessions.push(currentRecord);
      } else {
        // Start new group
        mergedSessions.push(currentGroup);
        currentGroup = {
          startTime: currentRecordStart,
          endTime: currentRecordEnd,
          totalDuration: currentRecord.session_length,
          sessions: [currentRecord]
        };
      }
    }
    
    // Don't forget the last group
    mergedSessions.push(currentGroup);

    // Convert merged sessions to timeline items
    return mergedSessions.map((session, index) => {
      const startMinutes = session.startTime.getHours() * 60 + session.startTime.getMinutes();
      const endMinutes = session.endTime.getHours() * 60 + session.endTime.getMinutes();
      
      const startPercent = startMinutes / (24 * 60);
      const durationPercent = (endMinutes - startMinutes) / (24 * 60);
      
      // Use scaled timeline height for positioning
      const topPosition = startPercent * timelineHeight * scalingFactor;
      const itemHeight = Math.max(durationPercent * timelineHeight * scalingFactor, 4);
      
      return {
        id: `merged-${session.startTime.getTime()}-${index}`,
        top: topPosition,
        height: itemHeight,
        startTime: session.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        endTime: session.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration: session.endTime.getTime() - session.startTime.getTime(),
        sessionsCount: session.sessions.length,
        record: session.sessions[0] // Keep first session for reference
      };
    });
  };

  const timelineItems = useMemo(() => generateTimelineItems(), [selectedAppRecords, timelineHeight, scalingFactor]);

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  // Handle mouse wheel scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY;
      const scrollSpeed = 0.3;
      const containerHeight = timelineBaseRef.current?.getBoundingClientRect().height || 0;
      const maxPosition = Math.max(0, containerHeight - height);
      const newPosition = Math.max(0, Math.min(maxPosition, position + (delta * scrollSpeed)));
      
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      
      setPosition(newPosition);
    };

    const container = boxRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [position, height]);

  // Handle dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineBaseRef.current) return;
      
      e.preventDefault();
      const containerHeight = timelineBaseRef.current.getBoundingClientRect().height;
      
      if (isDragging) {
        const deltaY = e.clientY - dragStart.y;
        const maxPosition = containerHeight - height;
        const newPosition = Math.max(0, Math.min(maxPosition, dragStart.startPos + deltaY));
        setPosition(newPosition);
      } else if (isResizingTop) {
        const deltaY = e.clientY - dragStart.y;
        const newHeight = Math.max(50, dragStart.startHeight - deltaY);
        const newPosition = Math.max(0, Math.min(dragStart.startPos + deltaY, containerHeight - 50));
        
        const maxPosition = containerHeight - newHeight;
        const finalPosition = Math.max(0, Math.min(newPosition, maxPosition));
        const adjustedHeight = Math.max(50, Math.min(newHeight, containerHeight - finalPosition));
        
        setHeight(adjustedHeight);
        setPosition(finalPosition);
      } else if (isResizingBottom) {
        const deltaY = e.clientY - dragStart.y;
        const newHeight = Math.max(50, dragStart.startHeight + deltaY);
        const maxHeight = containerHeight - position;
        setHeight(Math.min(newHeight, maxHeight));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizingTop(false);
      setIsResizingBottom(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging || isResizingTop || isResizingBottom) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'grabbing' : 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizingTop, isResizingBottom, dragStart, height, position]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      y: e.clientY,
      startPos: position,
      startHeight: height
    });
  };

  const handleResizeTopStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingTop(true);
    setDragStart({
      y: e.clientY,
      startPos: position,
      startHeight: height
    });
  };

  const handleResizeBottomStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingBottom(true);
    setDragStart({
      y: e.clientY,
      startPos: position,
      startHeight: height
    });
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
      <div style={{ flex: 2 }}>
        <div ref={boxRef} className={styles.timelineContainer}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.66)',
            position: 'sticky',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '10px 20px',
            zIndex: 20,
            backdropFilter: 'blur(10px)',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '300',
              color: 'rgba(158, 158, 158, 0.9)',
            }}>
              <FaTimeline />
              Timeline
            </span>
          </div>
          
          <div ref={timelineBaseRef} className={styles.timelineBase}>
            {/* Main timeline content area */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Time labels and hour lines */}
              <div style={{
                position: 'absolute',
                top: `${-(position * scalingFactor)}px`,
                left: 0,
                width: '100%',
                height: `${timelineHeight * scalingFactor}px`,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {Array.from({ length: 25 }, (_, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    position: 'absolute',
                    top: `${(i / 24) * timelineHeight * scalingFactor}px`,
                    width: '100%',
                  }}>
                    {/* Time label */}
                    <div style={{
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      textAlign: 'right',
                      width: '40px',
                      marginRight: '10px',
                    }}>
                      {i === 24 ? '24:00' : `${String(i).padStart(2, '0')}:00`}
                    </div>
                    {/* Hour line */}
                    <div style={{
                      flex: 1,
                      height: '1px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }} />
                  </div>
                ))}
              </div>

              {/* Current time indicator */}
              {currentTimePosition >= 0 && (
                <div style={{
                  position: 'absolute',
                  top: `${(currentTimePosition * timelineHeight * scalingFactor) - (position * scalingFactor)}px`,
                  left: '50px',
                  right: '0',
                  height: '2px',
                  backgroundColor: '#ff4444',
                  zIndex: 5,
                  boxShadow: '0 0 4px rgba(255, 68, 68, 0.5)',
                }} />
              )}

              {/* App usage blocks */}
              <div style={{
                position: 'absolute',
                top: `${-(position * scalingFactor)}px`,
                left: '60px',
                right: '10px',
                height: `${timelineHeight * scalingFactor}px`,
              }}>
                {timelineItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top: `${item.top}px`,
                      left: '0',
                      right: '0',
                      height: `${item.height}px`,
                      backgroundColor:'#877DFF',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      color: '#fff',
                      cursor: 'pointer',
                      zIndex: 3,
                    }}
                    title={`${item.startTime} - ${item.endTime} (${formatDuration(item.duration)})${item.sessionsCount > 1 ? ` • ${item.sessionsCount} sessions merged` : ''}`}
                  >
                    {item.height > 20 && (
                      <span style={{ textAlign: 'center', padding: '2px' }}>
                        {item.startTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Scroll container - positioned on the right */}
            <div className={styles.scrollContainer}>
              <div
                className={styles.scrollContent}
                style={{
                  height: `${height}px`,
                  transform: `translateY(${position}px)`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  position: 'relative',
                  userSelect: 'none',
                  transition: isScrolling ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
                }}
                onMouseDown={handleDragStart}
              >
                {/* Resize handles */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '0px',
                    width: '100%',
                    height: '12px',
                    cursor: 'ns-resize',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    opacity: isResizingTop ? 1 : 0.3,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    zIndex: 10,
                  }}
                  onMouseDown={handleResizeTopStart}
                >
                  <IoMdArrowDropup style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    color: 'white',
                    fontSize: '16px',
                  }} />
                </div>
                
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: '0px',
                    width: '100%',
                    height: '12px',
                    cursor: 'ns-resize',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    opacity: isResizingBottom ? 1 : 0.3,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    zIndex: 10,
                  }}
                  onMouseDown={handleResizeBottomStart}
                >
                  <IoMdArrowDropdown style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    color: 'white',
                    fontSize: '16px',
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apps List Section */}
      <div style={{ flex: 1 }}>
        <div style={{
          backgroundColor: '#070707',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.66)',
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: '300',
              color: 'rgba(158, 158, 158, 0.9)',
            }}>
              <IoApps />
              Applications
            </span>
          </div>

          <div style={{ 
            padding: '20px', 
            overflowY: 'auto', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {topApps.length === 0 ? (
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
                <p>No app data available</p>
              </div>
            ) : (
              topApps.map((app, index) => (
                <div
                  key={`${app.title}-${index}`}
                  onClick={() => setSelectedApp(app.title)}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedApp === app.title ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: selectedApp === app.title ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedApp !== app.title) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedApp !== app.title) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>

                    <div style={{
                      fontSize: '14px',
                      fontWeight: selectedApp === app.title ? '500' : '400',
                      color: 'rgba(255, 255, 255, 0.9)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {app.title}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{app.category}</span>
                    <span>{formatDuration(app.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
