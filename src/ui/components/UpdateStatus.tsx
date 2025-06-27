import React, { useEffect, useState } from 'react';
import { MdDownload, MdRefresh, MdCheckCircle, MdError, MdUpdate } from 'react-icons/md';

interface UpdateStatusProps {
  className?: string;
}

interface UpdateStatus {
  type: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  message: string;
  version?: string;
  progress?: number;
  speed?: string;
  error?: string;
}

const UpdateStatus: React.FC<UpdateStatusProps> = ({ className }) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isCheckingManually, setIsCheckingManually] = useState(false);

  useEffect(() => {
    // Listen for update status changes
    window.electronAPI.onUpdateStatus((status: UpdateStatus) => {
      console.log('Update status received:', status);
      setUpdateStatus(status);
      if (status.type !== 'checking') {
        setIsCheckingManually(false);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeUpdateListener();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    try {
      setIsCheckingManually(true);
      setUpdateStatus({ type: 'checking', message: 'Checking for updates...' });
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateStatus({ 
        type: 'error', 
        message: 'Failed to check for updates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsCheckingManually(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Error installing update:', error);
    }
  };

  const getStatusIcon = () => {
    if (!updateStatus) return <MdUpdate />;
    
    switch (updateStatus.type) {
      case 'checking':
        return <MdRefresh className="spin" />;
      case 'available':
      case 'downloading':
        return <MdDownload />;
      case 'downloaded':
        return <MdCheckCircle style={{ color: '#28a745' }} />;
      case 'not-available':
        return <MdCheckCircle style={{ color: '#28a745' }} />;
      case 'error':
        return <MdError style={{ color: '#dc3545' }} />;
      default:
        return <MdUpdate />;
    }
  };

  const getStatusColor = () => {
    if (!updateStatus) return '#007bff';
    
    switch (updateStatus.type) {
      case 'checking':
      case 'downloading':
        return '#007bff';
      case 'available':
        return '#fd7e14';
      case 'downloaded':
      case 'not-available':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#007bff';
    }
  };

  const renderProgressBar = () => {
    if (updateStatus?.type === 'downloading' && updateStatus.progress !== undefined) {
      return (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#333',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${updateStatus.progress}%`,
              height: '100%',
              backgroundColor: '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#ccc',
            marginTop: '5px'
          }}>
            <span>{updateStatus.progress}%</span>
            {updateStatus.speed && <span>{updateStatus.speed} MB/s</span>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className} style={{
      backgroundColor: '#070707',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <h3 style={{
        margin: '0 0 15px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {getStatusIcon()}
        App Updates
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getStatusColor()
          }} />
          <span style={{ color: '#ccc' }}>
            {updateStatus?.message || 'App is up to date'}
          </span>
        </div>

        {updateStatus?.version && (
          <div style={{ fontSize: '14px', color: '#888', marginLeft: '22px' }}>
            Version: {updateStatus.version}
          </div>
        )}

        {updateStatus?.error && (
          <div style={{ 
            fontSize: '14px', 
            color: '#dc3545', 
            marginLeft: '22px',
            marginTop: '5px'
          }}>
            Error: {updateStatus.error}
          </div>
        )}

        {renderProgressBar()}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleCheckForUpdates}
          disabled={isCheckingManually || updateStatus?.type === 'checking'}
          style={{
            padding: '8px 16px',
            backgroundColor: isCheckingManually || updateStatus?.type === 'checking' ? '#555' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCheckingManually || updateStatus?.type === 'checking' ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MdRefresh style={{
            animation: (isCheckingManually || updateStatus?.type === 'checking') ? 'spin 1s linear infinite' : 'none'
          }} />
          {isCheckingManually || updateStatus?.type === 'checking' ? 'Checking...' : 'Check for Updates'}
        </button>

        {updateStatus?.type === 'downloaded' && (
          <button
            onClick={handleInstallUpdate}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MdUpdate />
            Install & Restart
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default UpdateStatus;
