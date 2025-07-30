# 🐛 Focus Mode Update Troubleshooting Guide

## The Issue
Components don't update automatically when focus mode starts/stops - requires Ctrl+R to see changes.

## 🔍 **Debugging Steps**

### Step 1: Check Console Logs
1. Open DevTools (F12)
2. Go to Focus Mode page
3. Look for these console messages when the page loads:

```
🔧 FocusContext: Setting up event listeners...
✅ FocusContext: Setting up onFocusModeStarted listener
✅ FocusContext: Setting up onFocusModeEnded listener
✅ FocusContext: All event listeners setup complete
🔧 FocusContext: Loading initial focus data...
✅ FocusContext: Initial data loaded
```

**If you DON'T see these messages:**
- The FocusProvider is not wrapping your app correctly
- Check that App.tsx has `<FocusProvider>` around the router

### Step 2: Use the IPC Tester
1. Go to Focus Mode page
2. A troubleshooting popup should appear in the center
3. Click "Test API" - should show all methods as available
4. Click "Test Events" to set up event listeners
5. Click "Test Toggle" to trigger focus mode
6. Watch for event messages in the popup

**Expected results:**
```
✅ startFocusMode is available
✅ endFocusMode is available  
✅ onFocusModeStarted is available
✅ onFocusModeEnded is available
🎯 Start event received: {session: {...}}
🛑 End event received: {session: {...}}
```

### Step 3: Check Focus Mode Toggle
1. Click focus button in Sidebar
2. Look for these console messages:

```
🚀 FocusContext: startFocusMode called
🔧 FocusContext: Calling electronAPI.startFocusMode()
📋 FocusContext: startFocusMode result: {success: true, ...}
✅ FocusContext: Focus mode started successfully
🎯 FocusContext: Focus mode started event received!
🔄 FocusReducer: Action dispatched: FOCUS_STARTED
🚀 FocusReducer: FOCUS_STARTED - Setting active state
✅ FocusReducer: New state after FOCUS_STARTED: {isActive: true, ...}
```

## 🔧 **Common Issues & Solutions**

### Issue 1: No Console Logs from FocusContext
**Problem:** FocusProvider not wrapping components
**Solution:** Verify App.tsx has this structure:
```tsx
return (
  <FocusProvider>
    <Router>
      {/* your app content */}
    </Router>
  </FocusProvider>
);
```

### Issue 2: API Methods Not Available
**Problem:** Electron preload script not loaded
**Solution:** 
- Check main.ts webPreferences.preload path
- Verify preload.ts is being built correctly
- Check for TypeScript/build errors

### Issue 3: Events Not Firing
**Problem:** Event listeners not set up or removed too early
**Solution:**
- Check if removeFocusModeListeners is being called too early
- Verify event names match between main process and preload
- Main process sends: 'focus-mode-started', 'focus-mode-ended'
- Preload listens for same event names

### Issue 4: Actions Work But UI Doesn't Update
**Problem:** Components not subscribed to context changes
**Solution:**
- Verify components use hooks like `useFocusToggle()`
- Check that hooks are called inside the FocusProvider tree
- Look for React StrictMode issues (double mounting)

### Issue 5: Events Fire But State Not Updated
**Problem:** Reducer not handling actions correctly
**Solution:**
- Check reducer console logs for action dispatching
- Verify action payload structure matches expected format
- Look for TypeScript errors in reducer

## 🚀 **Quick Fix Commands**

If events aren't firing, try this in DevTools console:
```javascript
// Test manual event trigger
window.electronAPI.onFocusModeStarted((data) => {
  console.log('Manual test event received:', data);
});

// Test if start/end methods work
window.electronAPI.startFocusMode().then(console.log);
```

## 📋 **Verification Checklist**

- [ ] Console shows FocusContext setup messages
- [ ] IPC Tester shows all methods available  
- [ ] Focus toggle shows action/reducer logs
- [ ] Event listeners receive events when toggling
- [ ] State debugger shows live updates
- [ ] Notification component shows status changes

## 🔬 **Advanced Debugging**

### Check Main Process Logs
Look for these in Electron main process logs:
```
IPC: Starting focus mode
Focus mode started for user: ...
Sending focus-mode-started event
```

### Check Event Timing
Add this to see event timing:
```javascript
// In console
let eventCount = 0;
window.electronAPI.onFocusModeStarted(() => {
  console.log(`Event ${++eventCount} received at ${Date.now()}`);
});
```

### Force State Sync
If events work but state is wrong, manually dispatch:
```javascript
// In console (not for production!)
window.dispatchFocusEvent = (type, payload) => {
  // This would need to be exposed for debugging
};
```

## 💡 **Final Notes**

1. **Remove debug components** after fixing (FocusIPCTester, etc.)
2. **Keep console logging** temporarily to monitor in production
3. **Test in both dev and built app** - behavior can differ
4. **Check for timing issues** - some events might fire before listeners are ready

The key is finding where the chain breaks:
`Button Click → Action → IPC → Main Process → Event → Listener → Reducer → State → UI Update`
