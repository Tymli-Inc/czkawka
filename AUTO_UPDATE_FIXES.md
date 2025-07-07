# Auto-Update Fixes - Resolved "Update Only Once" Issue

## Problem Summary
The application was only able to update once, and subsequent updates would fail. This was caused by several issues in the auto-update logic that prevented proper version tracking and update detection.

## Root Causes Identified

### 1. **Flawed Version Comparison**
- The original code used simple string equality (`info.version === currentVersion`) 
- This doesn't work reliably with semantic versioning (e.g., "0.0.13" vs "0.0.14")

### 2. **Persistent State Management Issues**
- The `lastInstalledVersion` wasn't being cleared properly after successful updates
- The `isPostUpdateRestart` flag was preventing updates for only 30 seconds
- Cache wasn't being cleared consistently between updates

### 3. **Update Detection Logic**
- The version comparison logic for detecting post-update restarts was flawed
- Didn't properly handle Squirrel installer restart scenarios

### 4. **Cache Management**
- electron-updater cache wasn't being cleared between updates
- Stale cache data could prevent proper update detection

## Fixes Implemented

### 1. **Improved Version Comparison**
```typescript
// Added semantic version comparison function
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  // ... proper semantic version comparison logic
}
```

### 2. **Enhanced Cache Management**
```typescript
// Added comprehensive cache clearing function
function clearUpdaterCache() {
  // Clear electron-updater cache directory
  // Clear pending update files
  // Log actions for debugging
}
```

### 3. **Better Update State Management**
- Added `skipNextUpdateCheck` flag for more granular control
- Increased post-update cooldown to 60 seconds
- Improved version tracking logic using proper semantic versioning

### 4. **Squirrel Integration Detection**
- Added detection for Squirrel installer restarts
- Better handling of first-time installs vs updates
- Improved logging for debugging

### 5. **Robust Update Detection Logic**
```typescript
// Improved post-update detection
if (lastVersion && compareVersions(lastVersion, currentVersion) < 0) {
  // Proper update detection with semantic versioning
  // Clear cache and reset flags
  // Schedule proper cooldown period
}
```

### 6. **Additional Safety Features**
- Added `forceCheckForUpdates()` function that bypasses all flags
- Enhanced error handling and logging
- Better cache invalidation on each update check
- Improved configuration for electron-updater

## New Features Added

### 1. **Force Update Check API**
```typescript
// New API for forcing update checks (bypasses cooldowns)
electronAPI.forceCheckForUpdates()
```

### 2. **Enhanced Logging**
- More detailed logging for debugging update issues
- System information logging on startup
- Better error reporting

### 3. **Improved Configuration**
- Added cache control headers to prevent caching issues
- Better electron-updater settings for reliability
- Enhanced error handling

## Files Modified

1. **`src/electron/autoUpdate.ts`** - Main auto-update logic
   - Added version comparison function
   - Improved cache management
   - Enhanced state management
   - Added Squirrel detection

2. **`src/electron/ipcHandlers.ts`** - IPC communication
   - Added `force-check-for-updates` handler

3. **`src/electron/preload.ts`** - Renderer process bridge
   - Added `forceCheckForUpdates` function

4. **`src/types/electronAPI.ts`** - TypeScript definitions
   - Added type definitions for new API

## Testing Recommendations

1. **Test Multiple Updates in Sequence**
   - Update from version A to B, then B to C, then C to D
   - Verify each update works without manual intervention

2. **Test Different Scenarios**
   - Fresh install + update
   - Manual app launch + update
   - Auto-launch on boot + update
   - Force update check functionality

3. **Monitor Logs**
   - Check electron logs for proper version detection
   - Verify cache clearing is working
   - Confirm post-update restart detection

## Debug Commands

If issues persist, you can use these debugging approaches:

1. **Check stored version**: Look in electron-store for `lastInstalledVersion`
2. **Clear update cache**: Delete the `hourglass-updater` folder in userData
3. **Force update check**: Use the new `forceCheckForUpdates()` API
4. **Reset update state**: Use the `resetUpdateState()` function

## Configuration Notes

- Update check interval: 4 hours (like Discord)
- Post-update cooldown: 60 seconds
- Cache clearing: On every update check
- Version comparison: Semantic versioning compatible

The fixes ensure that your app can now update multiple times in sequence without getting stuck after the first update.
