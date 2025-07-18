import React from 'react';
import { motion } from 'framer-motion';

const ProjectsPage: React.FC = () => {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      style={{
        padding: '2rem',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Projects</h1>
        <p style={{ fontSize: '1.2rem', color: '#ccc' }}>
          Project Management - Coming Soon
        </p>
      </div>
    </motion.div>
  );
};

export default ProjectsPage;
