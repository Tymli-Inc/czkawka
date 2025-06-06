import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    electronAPI: {
      getActiveWindow: () => Promise<{ title: string ; id: number} | null>;
      saveActiveWindow: (data: { title: string; unique_id: number }) => Promise<{ success: boolean }>;
      getActiveWindows: () => Promise<Array<{ id: number; title: string; unique_id: number; timestamp: number }>>;
    };
  }
}

const App = () => {
  const [activeWindow, setActiveWindow] = useState<{ id: number; title: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: number; title: string; unique_id: number; timestamp: number }>>([]);
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
          // await window.electronAPI.saveActiveWindow({ title: data.title, unique_id: data.id });
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

    const interval = setInterval(fetchActiveWindow, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    /*
    async function fetchHistory() {
      const hist = await window.electronAPI.getActiveWindows();
      setHistory(hist);
    }
    fetchHistory();
    */
  }, []);
  return (
    <div>
      <h1>Active Window Tracker</h1>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {activeWindow ? (
        <div>
          <h2>Current Active Window</h2>
          <p>Title: {activeWindow.title}</p>
          <p>id: {activeWindow.id}</p>
        </div>
      ) : (
        <p>No active window detected</p>
      )}

      {/* History section commented out since database functionality is disabled
      <h2>History (Last 100)</h2>
      <ul>
        {history.map((entry) => (
          <li key={entry.id}>
            {new Date(entry.timestamp).toLocaleTimeString()} <br/> 
            Title: {entry.title} <br/>
            ID: {entry.id ?? 'N/A'} <br/>
            Unique ID: {entry.unique_id}
          </li>
        ))}
      </ul>
      */}
    </div>
  );
};

export default App;
