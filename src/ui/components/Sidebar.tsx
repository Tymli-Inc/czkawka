import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowRight, MdHome, MdTimeline } from "react-icons/md";
import {IoAnalytics, IoPlay} from "react-icons/io5";
import {AiFillPieChart} from "react-icons/ai";
import {PiClockFill} from "react-icons/pi";
import styles from "./sidebar.module.css";

const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);
  const location = useLocation();
  // Animation variants
  const sidebarVariants = {
    collapsed: {
      width: 80,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 40,
        mass: 1,
        delay: 0.12 // Wait for text to almost disappear
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
        delay: 0.12 // Sync with sidebar animation
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
        delay: 0.12 // Sync with sidebar animation
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
        duration: 0.1,
        ease: "easeOut" as const
      }    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        delay: 0.25,
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
        icon: <AiFillPieChart /> }
  ];return (
    <motion.div 
      className={styles.sidebar}
      variants={sidebarVariants}
      animate={expanded ? "expanded" : "collapsed"}
      initial="collapsed"
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
      <motion.div 
        onClick={() => setExpanded(v => !v)} 
        className={styles.ExpandBar}
        variants={expandBarVariants}
        animate={expanded ? "expanded" : "collapsed"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      />
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
