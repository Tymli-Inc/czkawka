import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
interface FocusSettings {
  duration: number;
  jobRole: string;
  isEnabled: boolean;
  showDistractionPopup: boolean;
  autoBreakReminder: boolean;
}

interface FocusSession {
  id: number;
  startTime: number;
  endTime: number;
  duration: number;
  jobRole: string;
  isActive: boolean;
  distractionCount: number;
  createdAt: string;
}

interface FocusState {
  isActive: boolean;
  loading: boolean;
  settings: FocusSettings;
  currentSession: FocusSession | null;
  timeRemaining: number;
  error: string | null;
}

// Action types
type FocusAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: FocusSettings }
  | { type: 'SET_SESSION'; payload: FocusSession | null }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_DISTRACTION_COUNT'; payload: number }
  | { type: 'FOCUS_STARTED'; payload: { session: FocusSession } }
  | { type: 'FOCUS_ENDED'; payload: { session?: FocusSession } }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: FocusState = {
  isActive: false,
  loading: false,
  settings: {
    duration: 45,
    jobRole: 'Software developer',
    isEnabled: false,
    showDistractionPopup: true,
    autoBreakReminder: true
  },
  currentSession: null,
  timeRemaining: 0,
  error: null,
};

// Reducer
function focusReducer(state: FocusState, action: FocusAction): FocusState {
  console.log('🔄 FocusReducer: Action dispatched:', action.type, action);
  
  switch (action.type) {
    case 'SET_LOADING':
      console.log('⏳ FocusReducer: Setting loading to:', action.payload);
      return { ...state, loading: action.payload };
    
    case 'SET_ACTIVE':
      console.log('🎯 FocusReducer: Setting active to:', action.payload);
      return { ...state, isActive: action.payload };
    
    case 'SET_SETTINGS':
      console.log('⚙️ FocusReducer: Setting settings:', action.payload);
      return { ...state, settings: action.payload };
    
    case 'SET_SESSION':
      console.log('📝 FocusReducer: Setting session:', action.payload);
      return { ...state, currentSession: action.payload };
    
    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload };
    
    case 'SET_ERROR':
      console.log('❌ FocusReducer: Setting error:', action.payload);
      return { ...state, error: action.payload };
    
    case 'UPDATE_DISTRACTION_COUNT':
      console.log('😵 FocusReducer: Updating distraction count:', action.payload);
      return {
        ...state,
        currentSession: state.currentSession ? {
          ...state.currentSession,
          distractionCount: action.payload
        } : null
      };
    
    case 'FOCUS_STARTED':
      console.log('🚀 FocusReducer: FOCUS_STARTED - Setting active state');
      const newStartState: FocusState = {
        ...state,
        isActive: true,
        currentSession: action.payload.session,
        timeRemaining: action.payload.session.duration,
        error: null as string | null
      };
      console.log('✅ FocusReducer: New state after FOCUS_STARTED:', newStartState);
      return newStartState;
    
    case 'FOCUS_ENDED':
      console.log('🛑 FocusReducer: FOCUS_ENDED - Setting inactive state');
      const newEndState: FocusState = {
        ...state,
        isActive: false,
        currentSession: null as FocusSession | null,
        timeRemaining: 0,
        error: null as string | null
      };
      console.log('✅ FocusReducer: New state after FOCUS_ENDED:', newEndState);
      return newEndState;
    
    case 'RESET_STATE':
      console.log('🔄 FocusReducer: Resetting state');
      return initialState;
    
    default:
      console.warn('⚠️ FocusReducer: Unknown action type:', action);
      return state;
  }
}

// Context
interface FocusContextType {
  state: FocusState;
  actions: {
    startFocusMode: () => Promise<boolean>;
    endFocusMode: () => Promise<boolean>;
    updateSettings: (settings: Partial<Omit<FocusSettings, 'jobRole'>>) => Promise<boolean>;
    loadFocusData: () => Promise<void>;
    clearError: () => void;
  };
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

// Provider component
interface FocusProviderProps {
  children: ReactNode;
}

export const FocusProvider: React.FC<FocusProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(focusReducer, initialState);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.isActive && state.currentSession) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - state.currentSession!.startTime;
        const remaining = Math.max(0, state.currentSession!.duration - elapsed);
        
        dispatch({ type: 'SET_TIME_REMAINING', payload: remaining });
        
        if (remaining <= 0) {
          dispatch({ type: 'FOCUS_ENDED', payload: {} });
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isActive, state.currentSession]);

  // Actions
  const loadFocusData = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const [settingsRes, statusRes] = await Promise.all([
        window.electronAPI.getFocusModeSettings(),
        window.electronAPI.getFocusModeStatus()
      ]);

      if (settingsRes.success && settingsRes.data) {
        dispatch({ type: 'SET_SETTINGS', payload: settingsRes.data });
      }

      if (statusRes.success && statusRes.data) {
        dispatch({ type: 'SET_ACTIVE', payload: statusRes.data.isActive });
        dispatch({ type: 'SET_SESSION', payload: statusRes.data.session });
        
        if (statusRes.data.session && statusRes.data.isActive) {
          const now = Date.now();
          const elapsed = now - statusRes.data.session.startTime;
          const remaining = Math.max(0, statusRes.data.session.duration - elapsed);
          dispatch({ type: 'SET_TIME_REMAINING', payload: remaining });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load focus data';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Failed to load focus data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Setup electron event listeners - only once when component mounts
  useEffect(() => {
    console.log('🔧 FocusContext: Setting up event listeners...');
    
    // Test if electronAPI is available
    if (!window.electronAPI) {
      console.error('❌ FocusContext: electronAPI not available!');
      return;
    }
    
    // Focus mode started
    const onFocusStarted = (data: any) => {
      console.log('🎯 FocusContext: Focus mode started event received!', data);
      dispatch({ type: 'FOCUS_STARTED', payload: data });
    };

    // Focus mode ended  
    const onFocusEnded = (data: any) => {
      console.log('✅ FocusContext: Focus mode ended event received!', data);
      dispatch({ type: 'FOCUS_ENDED', payload: data });
    };

    // Distraction count updated
    const onFocusDistraction = (data: any) => {
      console.log('😵 FocusContext: Distraction event received!', data);
      dispatch({ type: 'UPDATE_DISTRACTION_COUNT', payload: data.distractionCount });
    };

    // Settings updated
    const onSettingsUpdated = (newSettings: any) => {
      console.log('⚙️ FocusContext: Settings updated event received!', newSettings);
      dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    };
    
    // Setup listeners
    if (window.electronAPI.onFocusModeStarted) {
      console.log('✅ FocusContext: Setting up onFocusModeStarted listener');
      window.electronAPI.onFocusModeStarted(onFocusStarted);
    }

    if (window.electronAPI.onFocusModeEnded) {
      console.log('✅ FocusContext: Setting up onFocusModeEnded listener');
      window.electronAPI.onFocusModeEnded(onFocusEnded);
    }

    if (window.electronAPI.onFocusDistraction) {
      console.log('✅ FocusContext: Setting up onFocusDistraction listener');
      window.electronAPI.onFocusDistraction(onFocusDistraction);
    }

    if (window.electronAPI.onFocusSettingsUpdated) {
      console.log('✅ FocusContext: Setting up onFocusSettingsUpdated listener');
      window.electronAPI.onFocusSettingsUpdated(onSettingsUpdated);
    }

    console.log('✅ FocusContext: Event listeners setup complete');

    // Load initial data
    loadFocusData().catch((error) => {
      console.error('❌ FocusContext: Failed to load initial data:', error);
    });

    // Cleanup - only remove listeners on actual unmount
    return () => {
      console.log('🧹 FocusContext: Cleaning up event listeners');
      // Remove focus mode IPC listeners to prevent stale dispatch closures
      if (window.electronAPI.removeFocusModeListeners) {
        window.electronAPI.removeFocusModeListeners();
      }
    };
  }, []); // Only run once on mount


  const startFocusMode = async (): Promise<boolean> => {
    console.log('🚀 FocusContext: startFocusMode called');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      console.log('🔧 FocusContext: Calling electronAPI.startFocusMode()');
      const result = await window.electronAPI.startFocusMode();
      console.log('📋 FocusContext: startFocusMode result:', result);
      
      if (!result.success) {
        const errorMessage = result.message || 'Failed to start focus mode';
        console.error('❌ FocusContext: Start focus mode failed:', errorMessage);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        return false;
      }
      console.log('✅ FocusContext: Focus mode started successfully');
      // Immediately fetch latest session and dispatch FOCUS_STARTED for UI update
      try {
        const status = await window.electronAPI.getFocusModeStatus();
        if (status.success && status.data?.session) {
          dispatch({ type: 'FOCUS_STARTED', payload: { session: status.data.session } });
        }
      } catch (statusError) {
        console.error('Failed to fetch focus status after start:', statusError);
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start focus mode';
      console.error('❌ FocusContext: Exception in startFocusMode:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Failed to start focus mode:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const endFocusMode = async (): Promise<boolean> => {
    console.log('🛑 FocusContext: endFocusMode called');
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      console.log('🔧 FocusContext: Calling electronAPI.endFocusMode()');
      const result = await window.electronAPI.endFocusMode();
      console.log('📋 FocusContext: endFocusMode result:', result);
      
      if (!result.success) {
        const errorMessage = result.message || 'Failed to end focus mode';
        console.error('❌ FocusContext: End focus mode failed:', errorMessage);
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        return false;
      }
      
      console.log('✅ FocusContext: Focus mode ended successfully');
      // Dispatch FOCUS_ENDED for immediate UI update
      dispatch({ type: 'FOCUS_ENDED', payload: {} });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end focus mode';
      console.error('❌ FocusContext: Exception in endFocusMode:', error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Failed to end focus mode:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateSettings = async (newSettings: Partial<Omit<FocusSettings, 'jobRole'>>): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const result = await window.electronAPI.updateFocusModeSettings(newSettings);
      
      if (!result.success) {
        dispatch({ type: 'SET_ERROR', payload: result.message || 'Failed to update settings' });
        return false;
      }
      
      dispatch({ type: 'SET_SETTINGS', payload: { ...state.settings, ...newSettings } });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Failed to update settings:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const actions = {
    startFocusMode,
    endFocusMode,
    updateSettings,
    loadFocusData,
    clearError,
  };

  return (
    <FocusContext.Provider value={{ state, actions }}>
      {children}
    </FocusContext.Provider>
  );
};

// Custom hook to use the focus context
export const useFocus = (): FocusContextType => {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};

// Additional convenience hooks
export const useFocusState = () => {
  const { state } = useFocus();
  return state;
};

export const useFocusActions = () => {
  const { actions } = useFocus();
  return actions;
};

// Specific hooks for common use cases
export const useFocusToggle = () => {
  const { state, actions } = useFocus();
  
  const toggle = async (): Promise<boolean> => {
    if (state.loading) return false;
    
    if (state.isActive) {
      return await actions.endFocusMode();
    } else {
      return await actions.startFocusMode();
    }
  };
  
  return {
    isActive: state.isActive,
    loading: state.loading,
    toggle,
    error: state.error,
    clearError: actions.clearError,
  };
};

export const useFocusTimer = () => {
  const { state } = useFocus();
  
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  console.debug("isActive", state.isActive);
  return {
    timeRemaining: state.timeRemaining,
    currentSession: state.currentSession,
    formattedTime: formatTime(state.timeRemaining),
    isActive: state.isActive,
  };
};

// Hook to listen for focus state changes with callbacks
export const useFocusListener = (callbacks: {
  onFocusStart?: (session: FocusSession) => void;
  onFocusEnd?: (session?: FocusSession) => void;
  onDistraction?: (count: number) => void;
  onSettingsChange?: (settings: FocusSettings) => void;
}) => {
  const { state } = useFocus();
  const prevStateRef = React.useRef(state);
  
  React.useEffect(() => {
    const prevState = prevStateRef.current;
    
    // Focus started
    if (!prevState.isActive && state.isActive && state.currentSession) {
      callbacks.onFocusStart?.(state.currentSession);
    }
    
    // Focus ended
    if (prevState.isActive && !state.isActive) {
      callbacks.onFocusEnd?.(prevState.currentSession || undefined);
    }
    
    // Distraction count changed
    if (prevState.currentSession?.distractionCount !== state.currentSession?.distractionCount) {
      callbacks.onDistraction?.(state.currentSession?.distractionCount || 0);
    }
    
    // Settings changed
    if (JSON.stringify(prevState.settings) !== JSON.stringify(state.settings)) {
      callbacks.onSettingsChange?.(state.settings);
    }
    
    prevStateRef.current = state;
  }, [state, callbacks]);
  
  return state;
};
