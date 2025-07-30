# Automatic Focus State Updates - How It Works

## 🔄 **The Update Flow**

When a focus session starts or ends, here's exactly what happens:

### 1. **Trigger Event** (Any Component)
```tsx
// From Sidebar, Controls, or FocusMode - doesn't matter which
const { toggle } = useFocusToggle();
await toggle(); // This starts the chain reaction
```

### 2. **Context Action** (FocusContext)
```tsx
// Inside startFocusMode() or endFocusMode()
const result = await window.electronAPI.startFocusMode();
// This calls the Electron main process
```

### 3. **Electron Main Process** (Background)
- Updates internal focus state
- Emits IPC events to ALL renderer processes
- Manages actual focus mode functionality (blocking, etc.)

### 4. **IPC Event Received** (FocusContext)
```tsx
// Event listener automatically catches the event
window.electronAPI.onFocusModeStarted?.((data) => {
  console.log('FocusContext: Focus mode started', data);
  dispatch({ type: 'FOCUS_STARTED', payload: data });
});
```

### 5. **State Dispatch** (React Reducer)
```tsx
case 'FOCUS_STARTED':
  return {
    ...state,
    isActive: true,
    currentSession: action.payload.session,
    timeRemaining: action.payload.session.duration,
    error: null
  };
```

### 6. **Automatic Re-renders** (All Components)
Every component using focus hooks automatically re-renders with new state:

- ✅ **Sidebar** button changes from "Start" to "Stop"
- ✅ **Controls** component updates button text/icon
- ✅ **FocusMode** page shows active timer
- ✅ **Any future components** using the hooks

## 🎯 **Key Benefits**

### ✅ **Automatic Synchronization**
```tsx
// Component A triggers change
const { toggle } = useFocusToggle();
toggle();

// Component B automatically updates (no code needed!)
const { isActive } = useFocusToggle();
// isActive will be true automatically
```

### ✅ **Single Source of Truth**
- All components read from the same context state
- No data can get "out of sync"
- No manual refresh or update calls needed

### ✅ **Event-Driven Updates**
- Responds to events from Electron main process
- Handles external changes (like system-level focus ending)
- Real-time updates for all UI components

## 🔧 **Testing the Updates**

To see automatic state updates in action:

1. **Add the Debug Component** (already done):
   ```tsx
   import FocusStateDebugger from '../components/FocusStateDebugger';
   // Shows live state updates in top-right corner
   ```

2. **Try Different Triggers**:
   - Click focus button in **Sidebar** → Watch other components update
   - Use **Controls** component → Sidebar and FocusMode update
   - Use **FocusMode** buttons → Sidebar and Controls update

3. **Watch the Console**:
   ```
   FocusContext: Focus mode started {session: {...}}
   FocusContext: Focus mode ended {session: {...}}
   ```

## 📝 **Adding New Components**

To add focus functionality to any new component:

### Option 1: Simple Toggle Button
```tsx
import { useFocusToggle } from '../contexts/FocusContext';

function MyNewComponent() {
  const { isActive, loading, toggle } = useFocusToggle();
  
  return (
    <button onClick={toggle} disabled={loading}>
      {isActive ? 'End Focus' : 'Start Focus'}
    </button>
  );
  // This component will automatically stay in sync with all others!
}
```

### Option 2: Timer Display
```tsx
import { useFocusTimer } from '../contexts/FocusContext';

function FocusTimerWidget() {
  const { formattedTime, isActive, timeRemaining } = useFocusTimer();
  
  return isActive ? (
    <div>
      <span>Focus Time: {formattedTime}</span>
      <div>Progress: {((timeRemaining / (currentSession?.duration || 1)) * 100).toFixed(0)}%</div>
    </div>
  ) : null;
}
```

### Option 3: React to Focus Changes
```tsx
import { useFocusListener } from '../contexts/FocusContext';

function FocusNotifications() {
  useFocusListener({
    onFocusStart: (session) => {
      console.log('Focus started!', session);
      // Show notification, play sound, etc.
    },
    onFocusEnd: (session) => {
      console.log('Focus ended!', session);
      // Save data, show completion message, etc.
    },
    onDistraction: (count) => {
      console.log('Distraction detected!', count);
      // Show warning, log event, etc.
    }
  });
  
  return <div>Listening for focus changes...</div>;
}
```

## 🚀 **No Manual Updates Needed**

You do **NOT** need to:
- ❌ Call update functions manually
- ❌ Pass state between components
- ❌ Use props to sync state
- ❌ Call refresh or reload functions
- ❌ Set up event listeners in each component

The context system handles all of this automatically through:
- **React Context** for state sharing
- **useReducer** for predictable state updates  
- **Electron IPC** for main process communication
- **Custom hooks** for easy component integration

## 🎯 **Summary**

**When ANY component triggers a focus change, ALL components automatically update.**

This happens through the event-driven architecture:
`Component Action → Context → Electron → IPC Event → State Update → All Components Re-render`

The debug component will show you this happening in real-time!
