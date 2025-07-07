import React, { useEffect, useState } from 'react';
import { MdDownload, MdRefresh, MdCheckCircle, MdError, MdUpdate, MdCloudDownload, MdRestartAlt } from 'react-icons/md';

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
  transferred?: number;
  total?: number;
}

const UpdateStatus: React.FC<UpdateStatusProps> = ({ className }) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isCheckingManually, setIsCheckingManually] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Listen for update status changes
    window.electronAPI.onUpdateStatus((status: UpdateStatus) => {
      console.log('Update status received:', status);
      setUpdateStatus(status);
      if (status.type !== 'checking') {
        setIsCheckingManually(false);
      }
      // Auto-show details when downloading or if there's an error
      if (status.type === 'downloading' || status.type === 'error') {
        setShowDetails(true);
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
      setShowDetails(true);
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

  const handleResetUpdateState = async () => {
    try {
      await window.electronAPI.resetUpdateState();
      setUpdateStatus(null);
      setShowDetails(false);
    } catch (error) {
      console.error('Error resetting update state:', error);
    }
  };

  const getStatusIcon = () => {
    if (!updateStatus) return <MdUpdate />;
    
    switch (updateStatus.type) {
      case 'checking':
        return <MdRefresh className="spin" />;
      case 'available':
        return <MdCloudDownload style={{ color: '#fd7e14' }} />;
      case 'downloading':
        return <MdDownload className="pulse" style={{ color: '#007bff' }} />;
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
        return '#6c757d';
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderProgressBar = () => {
    if (updateStatus?.type === 'downloading' && updateStatus.progress !== undefined) {
      return (
        <div style={{ marginTop: '15px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '14px', color: '#ccc', fontWeight: '500' }}>
              Downloading update...
            </span>
            <span style={{ fontSize: '14px', color: '#007bff', fontWeight: '600' }}>
              {updateStatus.progress}%
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: '#333',
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div 
              className="progress-bar"
              style={{
                width: `${updateStatus.progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #007bff 0%, #0056b3 100%)',
                transition: 'width 0.3s ease',
                borderRadius: '5px'
              }} 
            />
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#888',
            marginTop: '8px'
          }}>
            <span>
              {updateStatus.transferred && updateStatus.total ? 
                `${formatBytes(updateStatus.transferred)} / ${formatBytes(updateStatus.total)}` : 
                'Downloading...'
              }
            </span>
            {updateStatus.speed && (
              <span>{updateStatus.speed} MB/s</span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getMainMessage = () => {
    if (!updateStatus) return 'Ready to check for updates';
    
    switch (updateStatus.type) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return `Update available: v${updateStatus.version || 'Unknown'}`;
      case 'downloading':
        return 'Downloading update';
      case 'downloaded':
        return 'Update ready to install!';
      case 'not-available':
        return 'App is up to date';
      case 'error':
        return 'Update check failed';
      default:
        return updateStatus.message || 'Unknown status';
    }
  };

  return (
    <div className={className} style={{
      backgroundColor: '#070707',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '18px'
      }}>
        {getStatusIcon()}
        App Updates
      </h3>

      {/* Main Status Display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '6px',
        border: `1px solid ${getStatusColor()}33`
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          flexShrink: 0
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ 
            color: '#fff', 
            fontWeight: '500',
            marginBottom: updateStatus?.version ? '4px' : '0'
          }}>
            {getMainMessage()}
          </div>
          {updateStatus?.version && updateStatus.type !== 'downloading' && (
            <div style={{ fontSize: '13px', color: '#888' }}>
              Version: {updateStatus.version}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar for Downloads */}
      {renderProgressBar()}

      {/* Error Details */}
      {updateStatus?.error && (
        <div style={{ 
          marginTop: '15px',
          padding: '12px',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(220, 53, 69, 0.3)'
        }}>
          <div style={{ fontSize: '14px', color: '#dc3545', fontWeight: '500' }}>
            Error Details:
          </div>
          <div style={{ fontSize: '13px', color: '#dc3545', marginTop: '4px' }}>
            {updateStatus.error}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleCheckForUpdates}
          disabled={isCheckingManually || updateStatus?.type === 'checking' || updateStatus?.type === 'downloading'}
          style={{
            padding: '12px 20px',
            backgroundColor: (isCheckingManually || updateStatus?.type === 'checking' || updateStatus?.type === 'downloading') ? '#555' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (isCheckingManually || updateStatus?.type === 'checking' || updateStatus?.type === 'downloading') ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
        >
          <MdRefresh style={{
            animation: (isCheckingManually || updateStatus?.type === 'checking') ? 'spin 1s linear infinite' : 'none'
          }} />
          {isCheckingManually || updateStatus?.type === 'checking' ? 'Checking...' : 
           updateStatus?.type === 'downloading' ? 'Downloading...' : 'Check for Updates'}
        </button>

        {updateStatus?.type === 'downloaded' && (
          <button
            onClick={handleInstallUpdate}
            style={{
              padding: '12px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            <MdUpdate />
            Install & Restart
          </button>
        )}

        {(updateStatus?.type === 'error' || updateStatus?.type === 'available') && (
          <button
            onClick={handleResetUpdateState}
            style={{
              padding: '12px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            <MdRestartAlt />
            Reset Update State
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          .pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }
          .progress-bar {
            position: relative;
            overflow: hidden;
          }
          .progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: shimmer 2s infinite;
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default UpdateStatus;
