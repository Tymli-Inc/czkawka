import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowRight, MdHome, MdTimeline, MdBlock, MdSettings, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { IoAnalytics, IoPlay } from "react-icons/io5";
import { AiFillPieChart } from "react-icons/ai";
import { PiClockFill } from "react-icons/pi";
import styles from "./sidebar.module.css";

const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);
  const location = useLocation();

  // Handle mouse enter and leave for hover expansion
  const handleMouseEnter = () => {
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    setExpanded(false);
  };

  // Animation variants
  const sidebarVariants = {
    collapsed: {
      width: 80,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 40,
        mass: 1,
        delay: 0.08 // Reduced delay for smoother hover
      }
    },
    expanded: {
      width: 200,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 40,
        mass: 1
      }
    }
  };
  const expandBarVariants = {
    collapsed: {
      width: 25,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        delay: 0.08 // Reduced delay to sync with sidebar animation
      }
    },
    expanded: {
      width: 165,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    }
  };
  const navItemVariants = {
    collapsed: {
      width: 45,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        delay: 0.08 
      }
    },
    expanded: {
      width: 180,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30      }
    }
  };
  const labelVariants = {
    hidden: {
      opacity: 0,
      x: -10,
      transition: {
        duration: 0.08,
        ease: "easeOut" as const
      }    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.25,
        delay: 0.2, // Slightly reduced delay for faster hover response
        ease: "easeOut" as const
      }
    }
  };
  const menuItems: {
    path: string;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { path: '/', label: 'Home',
        //@ts-ignore
        icon: <MdHome /> },
    { path: '/analytics', label: 'Analytics',
        //@ts-ignore
        icon: <IoAnalytics /> },
    { path: '/screentime', label: 'Screentime',
        //@ts-ignore
        icon: <PiClockFill /> },
    { path: '/categories', label: 'Categories',
        //@ts-ignore
        icon: <AiFillPieChart /> },
    { path: '/blocking', label: 'Blocking',
        //@ts-ignore
        icon: <MdBlock /> },
    { path: '/settings', label: 'Settings',
        //@ts-ignore
        icon: <MdSettings /> }
  ];  

  // Window tracking state
  useEffect(() => {
    // Get initial status
    window.electronAPI.getWindowTrackingStatus().then(setTrackingEnabled);
    // Subscribe to changes
    window.electronAPI.onTrackingStatusChanged((enabled) => {
      setTrackingEnabled(enabled);
    });
    return () => {
      window.electronAPI.removeTrackingStatusListener();
    };
  }, []);

  const handleToggleTracking = async () => {
    const enabled = await window.electronAPI.toggleWindowTracking();
    setTrackingEnabled(enabled);
  };

  return (
    <motion.div 
      className={styles.sidebar}
      variants={sidebarVariants}
      animate={expanded ? "expanded" : "collapsed"}
      initial="collapsed"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(125, 212, 255, 1)" />
            <stop offset="31.61%" stopColor="rgba(135, 125, 255, 1)" />
            <stop offset="66.65%" stopColor="rgba(165, 84, 232, 1)" />
            <stop offset="100%" stopColor="rgba(255, 156, 245, 1)" />
          </linearGradient>
        </defs>
      </svg>
      {/* <motion.div 
        className={styles.ExpandBar}
        variants={expandBarVariants}
        animate={expanded ? "expanded" : "collapsed"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      /> */}
      <nav style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }} className={expanded ? styles.sidebarExpanded : ""}>
        <ul className={styles.navList}>
          {menuItems.map((item) => (
            <motion.li 
              key={item.path} 
              className={styles.navItem}
              variants={navItemVariants}
              animate={expanded ? "expanded" : "collapsed"}
            >
              <Link
                to={item.path}
                className={`${styles.link} ${location.pathname === item.path ? styles.linkActive : ''}`}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {item.icon}
                </motion.div>
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      variants={labelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      style={{
                        marginLeft: '6px',
                        fontSize: '13px',
                        color: '#ccc',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.li>
          ))}        
          </ul>
        
        {/* Window tracking toggle button */}
        <motion.div 
          className={styles.trackingButton}
           variants={navItemVariants}
           animate={expanded ? "expanded" : "collapsed"}
         >
          <button className={styles.link} onClick={handleToggleTracking}>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              {trackingEnabled ? <MdVisibility /> : <MdVisibilityOff />}
            </motion.div>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  style={{ marginLeft: '6px', fontSize: '13px', color: '#ccc', whiteSpace: 'nowrap' }}
                >
                  {trackingEnabled ? 'Tracking On' : 'Tracking Off'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
        
        {/* Focus Session button */}
        <motion.div 
          className={styles.focusButton}
           variants={navItemVariants}
           animate={expanded ? "expanded" : "collapsed"}
         >
          <button
            className={styles.link}
            onClick={() => {
              // Add your focus session logic here
              console.log('Focus Session clicked');
            }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <IoPlay />
            </motion.div>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  style={{
                    marginLeft: '1px',
                    fontSize: '13px',
                    fontWeight: '900',
                    color: '#000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Focus Session
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
        
      </nav>
    </motion.div>
  );
};

export default Sidebar;
