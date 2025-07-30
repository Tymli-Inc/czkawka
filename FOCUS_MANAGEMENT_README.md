# Focus Session Management System

## Overview

This project now uses a unified context-based approach for managing focus sessions across all components. This eliminates code duplication and ensures consistent state management.

## Architecture

### FocusContext (`src/ui/contexts/FocusContext.tsx`)

The central context provider that manages all focus session state and operations.

**Key Features:**
- Centralized state management using React useReducer
- Automatic timer management
- Event listener setup for Electron IPC
- Error handling with user-friendly messages
- Loading states for UI feedback

### Custom Hooks

#### `useFocus()`
Returns the complete focus context with state and actions.

#### `useFocusState()`
Returns only the focus state.

#### `useFocusActions()`
Returns only the focus actions.

#### `useFocusToggle()`
Convenience hook for components that only need to toggle focus mode:
```tsx
const { isActive, loading, toggle, error, clearError } = useFocusToggle();
```

#### `useFocusTimer()`
Convenience hook for timer-related functionality:
```tsx
const { timeRemaining, currentSession, formattedTime, isActive } = useFocusTimer();
```

## Updated Components

### 1. App Component
- Wrapped with `FocusProvider` to provide context to all child components

### 2. Sidebar Component
- Removed local focus state management
- Uses `useFocusToggle()` hook
- Shows loading state and proper error handling

### 3. Controls Component
- Simplified to use `useFocusToggle()` hook
- Removed duplicate event listeners and state management
- Better error handling with user alerts

### 4. FocusMode Page
- Uses `useFocus()` and `useFocusTimer()` hooks
- Removed local timer logic (now handled by context)
- Simplified component with better separation of concerns

## State Structure

```typescript
interface FocusState {
  isActive: boolean;           // Whether focus mode is currently active
  loading: boolean;            // Whether an operation is in progress
  settings: FocusSettings;     // User focus settings
  currentSession: FocusSession | null; // Current active session
  timeRemaining: number;       // Milliseconds remaining in session
  error: string | null;        // Current error message
}
```

## Benefits

1. **Single Source of Truth**: All focus state is managed in one place
2. **Automatic Synchronization**: All components automatically stay in sync
3. **Simplified Components**: Components focus on UI, not state management
4. **Better Error Handling**: Centralized error management with user feedback
5. **Reduced Code Duplication**: No more repeated logic across components
6. **Type Safety**: Full TypeScript support with proper typing
7. **Performance**: Optimized re-renders and efficient timer management

## Usage Examples

### Simple Toggle Button
```tsx
function FocusToggleButton() {
  const { isActive, loading, toggle } = useFocusToggle();
  
  return (
    <button onClick={toggle} disabled={loading}>
      {loading ? 'Loading...' : isActive ? 'End Focus' : 'Start Focus'}
    </button>
  );
}
```

### Timer Display
```tsx
function FocusTimer() {
  const { formattedTime, isActive } = useFocusTimer();
  
  return isActive ? <div>{formattedTime}</div> : null;
}
```

### Settings Management
```tsx
function FocusSettings() {
  const { state, actions } = useFocus();
  
  const updateDuration = (duration: number) => {
    actions.updateSettings({ duration });
  };
  
  return (
    <input 
      value={state.settings.duration}
      onChange={(e) => updateDuration(parseInt(e.target.value))}
    />
  );
}
```

This new architecture provides a solid foundation for focus session management that's maintainable, scalable, and easy to use across the entire application.
