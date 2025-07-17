import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import styles from "../timeline-new/timeline-new.module.css"; 
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ElectronAPI } from "src/types/electronAPI";
import { FaTimeline } from "react-icons/fa6";

interface FocusTimelineProps {
  selectedDate: Date;
  initialScalingFactor?: number;
  initialScrollerPosition?: number;
  onTimelineReady?: (methods: { moveToTime: (hour: number, minute?: number) => void }) => void;
}

interface window {
  electronAPI: ElectronAPI;
}

export default function FocusTimeline({ 
  selectedDate, 
  initialScalingFactor,
  initialScrollerPosition,
  onTimelineReady
}: FocusTimelineProps): React.JSX.Element {

  //calculation constants
  const dayInEpoch = 24 * 60 * 60 * 1000; 

  //functionality
  const boxRef = useRef<HTMLDivElement>(null);
  const timelineBaseRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState(0);
  const [timelineHeight, setTimelineHeight] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const [height, setHeight] = useState(200); // Default height
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, startPos: 0, startHeight: 0 });
  
  const [scalingFactor, setScalingFactor] = useState(initialScalingFactor);
  const [isScrolling, setIsScrolling] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [focusGroupedData, setFocusGroupedData] = useState<any[]>([]);

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

  //fetch focus mode data and transform it to match timeline format
  useEffect(() => {
    const fetchFocusData = async () => {
      try {
        const response = await window.electronAPI.getFocusModeHistory(1);
        
        if (response.success && response.data) {
          console.log('Focus timeline raw data:', response.data);
          
          // Filter sessions for the selected date
          const sessionsForDate = response.data.filter((session: any) => {
            const sessionDate = new Date(session.startTime);
            return sessionDate.toDateString() === selectedDate.toDateString();
          });
          
          console.log('Sessions for date:', sessionsForDate);
          console.log('Selected date:', selectedDate.toDateString());
          
          // Transform focus sessions to match timeline data structure
          const transformedData = sessionsForDate.map((session: any) => {
            const sessionTitle = session.title 
              ? session.title 
              : `${session.jobRole} Focus Session`;
            
            const sessionLength = session.endTime ? session.endTime - session.startTime : session.duration;
            const sessionStart = session.startTime;
            const sessionEnd = session.endTime || (session.startTime + session.duration);
            
            return {
              categories: [{
                name: 'focus_mode',
                color: '#877DFF'
              }],
              appData: [{
                title: sessionTitle,
                session_length: sessionLength,
                category: 'focus_mode'
              }],
              session_length: sessionLength,
              session_start: sessionStart,
              session_end: sessionEnd
            };
          });
          
          setFocusGroupedData(transformedData);
          console.log('Focus timeline data:', transformedData);
        }
      } catch (error) {
        console.error('Failed to fetch focus timeline data:', error);
      }
    };

    fetchFocusData();
  }, [selectedDate]);

  // Listen for focus mode events to refresh timeline
  useEffect(() => {
    const handleFocusUpdate = () => {
      const fetchFocusData = async () => {
        try {
          const response = await window.electronAPI.getFocusModeHistory(1);
          
          if (response.success && response.data) {
            console.log('Focus timeline event update raw data:', response.data);
            
            const sessionsForDate = response.data.filter((session: any) => {
              const sessionDate = new Date(session.startTime);
              return sessionDate.toDateString() === selectedDate.toDateString();
            });
            
            console.log('Event update sessions for date:', sessionsForDate);
            
            const transformedData = sessionsForDate.map((session: any) => {
              const sessionTitle = session.title 
                ? session.title 
                : `${session.jobRole} Focus Session`;
              
              const sessionLength = session.endTime ? session.endTime - session.startTime : session.duration;
              const sessionStart = session.startTime;
              const sessionEnd = session.endTime || (session.startTime + session.duration);
              
              return {
                categories: [{
                  name: 'focus_mode',
                  color: '#877DFF'
                }],
                appData: [{
                  title: sessionTitle,
                  session_length: sessionLength,
                  category: 'focus_mode'
                }],
                session_length: sessionLength,
                session_start: sessionStart,
                session_end: sessionEnd
              };
            });
            
            setFocusGroupedData(transformedData);
          }
        } catch (error) {
          console.error('Failed to fetch focus timeline data:', error);
        }
      };

      fetchFocusData();
    };

    window.electronAPI.onFocusModeStarted?.(handleFocusUpdate);
    window.electronAPI.onFocusModeEnded?.(handleFocusUpdate);

    return () => {
      window.electronAPI.removeFocusModeListeners?.();
    };
  }, [selectedDate]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get current time position as percentage of the day
  const getCurrentTimePosition = (): number => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    return (hours * 60 + minutes + seconds / 60) / (24 * 60); // 0-1 range
  };

  // Method to move to a specific time (accepts hour in 24-hour format)
  const moveToTime = (targetHour: number, targetMinute: number = 0) => {
    if (!timelineHeight || !isInitialized) return;
    
    const targetTimePos = (targetHour * 60 + targetMinute) / (24 * 60);
    const targetPixelPos = targetTimePos * timelineHeight;
    const newPosition = Math.max(0, Math.min(targetPixelPos - height / 2, timelineHeight - height));
    
    // Add smooth transition for programmatic movements
    setIsScrolling(true);
    setPosition(newPosition);
    
    // Reset scrolling state after animation
    setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  };

  // Expose methods to parent component
  useEffect(() => {
    if (onTimelineReady && isInitialized) {
      onTimelineReady({ moveToTime });
    }
  }, [onTimelineReady, isInitialized]);

  // Initialize component with timeline height
  useEffect(() => {
    if (timelineBaseRef.current && !isInitialized) {
      const containerHeight = timelineBaseRef.current.getBoundingClientRect().height;
      setTimelineHeight(containerHeight);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Set initial position after initialization
  useEffect(() => {
    if (timelineHeight > 0 && isInitialized) {
      let initialPos = 0;
      
      if (initialScrollerPosition !== undefined) {
        // Use provided initial position
        initialPos = Math.max(0, Math.min(initialScrollerPosition, timelineHeight - height));
      } else {
        // Default to current time position for today's date
        if (selectedDate.toDateString() === new Date().toDateString()) {
          const currentTimePos = getCurrentTimePosition();
          const targetPixelPos = currentTimePos * timelineHeight;
          initialPos = Math.max(0,1);
        }
      }
      
      setPosition(initialPos);
    }
  }, [timelineHeight, isInitialized, initialScrollerPosition, height, selectedDate]);

  useEffect(() => {
    console.log("scaling factor changed:", scalingFactor);
  }, [scalingFactor]);

  // Set initial height based on desired scaling factor (only once)
  useEffect(() => {
    if (timelineHeight > 0 && isInitialized && initialScalingFactor && height === 200) {
      // Only set initial height if it's still the default value
      const targetHeight = timelineHeight / initialScalingFactor;
      const clampedHeight = Math.max(50, Math.min(targetHeight, timelineHeight - 50));
      setHeight(clampedHeight);
    }
  }, [timelineHeight, isInitialized, initialScalingFactor, height]);

  // Update scaling factor whenever height changes (including manual resizing)
  useEffect(() => {
    if (timelineHeight > 0 && height > 0) {
      const newScalingFactor = timelineHeight / height;
      setScalingFactor(newScalingFactor);
    }
  }, [timelineHeight, height]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize(window.innerHeight);
      
      if (timelineBaseRef.current) {
        const containerHeight = timelineBaseRef.current.getBoundingClientRect().height;
        const oldTimelineHeight = timelineHeight;
        setTimelineHeight(containerHeight);
        
        // Maintain relative position and desired scaling factor after resize
        if (isInitialized && oldTimelineHeight > 0) {
          const relativePosition = position / oldTimelineHeight;
          
          // Calculate new height to maintain desired scaling factor
          const targetHeight = initialScalingFactor ? containerHeight / initialScalingFactor : containerHeight / 2.5;
          const newHeight = Math.max(50, Math.min(targetHeight, containerHeight - 50));
          const newPosition = Math.max(0, Math.min(relativePosition * containerHeight, containerHeight - newHeight));
          
          setHeight(newHeight);
          setPosition(newPosition);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, timelineHeight, isInitialized, initialScalingFactor]);

  // Handle mouse wheel and touchpad scrolling with smooth animation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Prevent default scrolling behavior
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate scroll delta (normalized for different devices)
      const delta = e.deltaY;
      const scrollSpeed = 0.3; // Adjust this value to control scroll sensitivity
      
      // Calculate new position
      const containerHeight = timelineBaseRef.current?.getBoundingClientRect().height || 0;
      const maxPosition = Math.max(0, containerHeight - height);
      const newPosition = Math.max(0, Math.min(maxPosition, position + (delta * scrollSpeed)));
      
      // Set scrolling state
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set new timeout to reset scrolling state
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      
      setPosition(newPosition);
    };

    const container = boxRef.current;
    if (container) {
      // Add event listener with passive: false to allow preventDefault
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [position, height]);

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
        
        // Ensure the element doesn't go outside bounds
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
  
  return <div ref={boxRef} className={styles.timelineContainer}>
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.66)',
      position: 'sticky',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '10px 20px',
      zIndex: 20,
      backdropFilter: 'blur(10px)',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
    }}>
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        fontSize: '18px',
        fontWeight: '300',
        color: 'rgba(158, 158, 158, 0.9)',
      }}>
        <FaTimeline />
      </span>
      <div className={styles.dataRailHeaderContainer}>
          <div className={styles.dataRailHeader}>
            Focus Sessions
          </div>
      </div>
    </div>
    <div ref={timelineBaseRef} className={styles.timelineBase}>
      {/* Main timeline content area */}

      <div style={{
        flex: 1,
        position: 'relative',
      }}>
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

        {/* Current time indicator - only show if viewing today */}
        {selectedDate.toDateString() === new Date().toDateString() && (() => {
          const currentTimePos = getCurrentTimePosition();
          return (
            <div 
              style={{
                position: 'absolute',
                top: `${(currentTimePos * timelineHeight * scalingFactor) - (position * scalingFactor)}px`,
                left: '50px',
                right: '0',
                height: '2px',
                backgroundColor: '#ff4444',
                zIndex: 5,
                boxShadow: '0 0 4px rgba(255, 68, 68, 0.5)',
              }}
            />
          );
        })()}

        {/* Focus mode sessions */}
        <div style={{
          position: 'absolute',
          top: `${-(position * scalingFactor)}px`,
          left: '60px',
          right: '10px',
          height: `${timelineHeight * scalingFactor}px`,
        }}>
          {focusGroupedData.map((session, index) => {
            const sessionStart = new Date(session.session_start);
            const sessionEnd = new Date(session.session_end);
            
            const startMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes();
            const endMinutes = sessionEnd.getHours() * 60 + sessionEnd.getMinutes();
            
            const startPercent = startMinutes / (24 * 60);
            const durationPercent = (endMinutes - startMinutes) / (24 * 60);
            
            const topPosition = startPercent * timelineHeight * scalingFactor;
            const itemHeight = Math.max(durationPercent * timelineHeight * scalingFactor, 4);
            
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  top: `${topPosition}px`,
                  left: '0',
                  right: '0',
                  height: `${itemHeight}px`,
                  backgroundColor: '#877DFF',
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
                title={`${sessionStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${sessionEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
              >
                {itemHeight > 20 && (
                  <span style={{ textAlign: 'center', padding: '2px' }}>
                    {session.appData[0].title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Scrollbar container - positioned on the right */}
      <div className={styles.scrollContainer}>          
        <div 
            ref={scrollContentRef}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = isResizingTop ? '1' : '0.3';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            }}
          >
            <IoMdArrowDropup style={{
              width: '100%',
              height: '100%',
              display: 'block',
              color: 'white',
              fontSize: '16px',
              textAlign: 'center',
              lineHeight: '8px'
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
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = isResizingBottom ? '1' : '0.3';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            }}
          >
            <IoMdArrowDropdown style={{
              width: '100%',
              height: '100%',
              display: 'block',
              color: 'white',
              fontSize: '16px',
              textAlign: 'center',
              lineHeight: '8px'
            }} />
          </div>
          
          {/* Content area */}
          <div 
            style={{ 
              padding: '12px 0', 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: isDragging ? 'none' : 'auto',
              height: '100%'
            }}
          >
            {/* Scrollbar indicator */}
          </div>
        </div>
      </div>
    </div>
  </div>
}
