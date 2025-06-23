# Timeline Component

A comprehensive React component that displays activity tracking data in a horizontal, zoomable timeline format, similar to professional time-tracking applications.

## Features

### Core Visualization
- **Horizontal Timeline Layout**: Displays timeline with dynamic time markers
- **Session Background Bars**: Grey background bars show when tracking was active (from `getTrackingTimes()`)
- **Window Activity Bars**: Colored bars overlaid on sessions show individual window activities (from `getActiveWindows()`)
- **Current Time Pointer**: Yellow animated line showing "NOW" position (only visible for today's date)
- **Date Navigation**: Navigate between different days with arrow buttons
- **Real-time Updates**: Includes refresh functionality and live time updates
- **Color-coded Applications**: Each application gets a unique color for easy identification
- **Activity Legend**: Shows all active applications with their total usage time
- **Responsive Design**: Adapts to different screen sizes

### Advanced Zoom Functionality
- **Multiple Zoom Levels**: Day, 12h, 6h, 3h, 1h views
- **Click-to-Zoom**: Click anywhere on the timeline to zoom into that specific time
- **Zoom Navigation**: Navigate through time when zoomed in using arrow controls
- **Dynamic Time Markers**: Automatically adjusts marker density based on zoom level
- **Zoom Indicator**: Shows current time range when zoomed in
- **Smart Zoom Behavior**: Constrains zoom to selected day boundaries

## Visual Design

The timeline follows this structure:
```
[Date Navigation] [Stats]
─────────────────────────────────────────────────
TIMELINE [Zoom Controls] [Refresh]
6:00  7:00  8:00  9:00  10:00  11:00  12:00...
├─────┤     ├──────────┤     ├─────┤           ← Session bars (grey)
  ├─┤ ├┤       ├──┤├┤├──┤       ├┤             ← Window bars (colored)
              ┃ NOW                             ← Current time pointer (yellow)

TIMELINE [3h] [‹] [›] [🔍 9:00-12:00] [Refresh]
9:00   9:10   9:20   9:30   9:40   9:50
├──────────────────────────────────┤           ← Session bars (grey)
  ├─┤ ├──┤ ├┤    ├───┤  ├┤                     ← Window bars (colored)
            ┃ NOW                               ← Current time pointer (yellow)
─────────────────────────────────────────────────
[Active Applications Legend]
```

## Zoom Controls

### Zoom Levels
- **Day**: Full 24-hour view with hourly markers
- **12h**: 12-hour view with hourly markers  
- **6h**: 6-hour view with 30-minute markers
- **3h**: 3-hour view with 15-minute markers
- **1h**: 1-hour view with 10-minute markers

### Zoom Interactions
1. **Zoom Buttons**: Click any zoom level to switch views
2. **Click-to-Zoom**: Click on timeline (Day view only) to zoom to that time
3. **Zoom Navigation**: Use ◄ ► buttons to move through time when zoomed
4. **Auto-Reset**: Changing dates resets zoom to Day view

## Current Time Indicator

### Real-time Pointer
- **Visual Indicator**: Bright yellow line with "NOW" label and pulsing animation
- **Smart Display**: Only appears when viewing today's date and current time is within visible range
- **Live Updates**: Updates position every minute automatically
- **Tooltip**: Hover to see exact current time
- **All Zoom Levels**: Visible across all zoom levels when applicable

### Behavior
- Automatically appears when timeline shows current day
- Disappears when viewing past/future dates
- Moves smoothly as time progresses (updates every minute)
- Provides immediate context for "where you are now" in the timeline

## Usage

### As a standalone component:
```tsx
import Timeline from './components/timeline/timeline';

function MyApp() {
  return (
    <div>
      <Timeline />
    </div>
  );
}
```

### As a page (recommended):
```tsx
import Timeline from '../components/timeline/timeline';

const TimelinePage: React.FC = () => {
  return (
    <div style={{ 
      height: '100%', 
      background: 'rgba(13, 13, 13, 1)',
      overflow: 'hidden'
    }}>
      <Timeline />
    </div>
  );
};
```

## Data Structure

The component expects the following data from the Electron API:

### Tracking Sessions
```typescript
interface TrackingSession {
  id: number;
  session_start: number;  // timestamp in milliseconds
  session_end: number;    // timestamp in milliseconds
}
```

### Window Records
```typescript
interface WindowRecord {
  id: number;
  title: string;
  unique_id: number;
  timestamp: number;      // timestamp in milliseconds
  session_length: number; // duration in milliseconds
}
```

## Required Electron API Methods

Make sure these methods are available in your `window.electronAPI`:

- `getTrackingTimes(days?: number)`: Returns tracking session data
- `getActiveWindows()`: Returns window tracking records

## Navigation

The component is automatically integrated into your app's navigation:
- Route: `/timeline`
- Menu item: "Timeline" in the sidebar
- Icon: Material Design timeline icon

## Timeline Layout

### Session Bars (Background)
- **Color**: Grey (rgba(128, 128, 128, 0.4))
- **Purpose**: Show when the tracking system was active
- **Position**: Background layer
- **Data Source**: `getTrackingTimes()` function

### Window Bars (Foreground)
- **Colors**: Auto-generated unique colors per application
- **Purpose**: Show specific application usage within active sessions
- **Position**: Foreground layer, overlaid on session bars
- **Data Source**: `getActiveWindows()` function

### Time Markers
- **Format**: 24-hour format (6:00, 7:00, 8:00, etc.)
- **Spacing**: Hourly intervals
- **Alignment**: Centered on the hour

## Features

### Date Navigation
- **Previous Day**: ← button
- **Next Day**: → button  
- **Current Date**: Displayed in full format (e.g., "Monday, January 29, 2021")

### Statistics Panel
- **Active Time**: Total time when tracking was active
- **Sessions**: Number of tracking sessions
- **Windows**: Number of different window activities

### Interactive Elements
- **Hover Effects**: Bars expand slightly on hover
- **Tooltips**: Show detailed timing and duration information
- **Legend**: Interactive legend showing all applications with total usage time

## Styling

The component uses custom CSS (`timeline.css`) with a dark theme:

- **Dark Background**: Matches your app's design (`rgba(13, 13, 13, 1)`)
- **Horizontal Layout**: Timeline bars positioned horizontally
- **Layered Approach**: Session bars as background, window bars as foreground
- **Smooth Animations**: CSS transitions and keyframe animations
- **Responsive Design**: Adapts to different screen sizes

## Performance

- **Date-based Filtering**: Only shows data for the selected date
- **Efficient Rendering**: Uses CSS positioning for optimal performance
- **Smart Color Generation**: Consistent colors for applications across sessions
- **Optimized Animations**: Staggered animations for smooth loading experience

## Layout & Controls
- **Timeline Header Layout**: Zoom controls are positioned next to the timeline label, with the refresh button on the far right
- **Compact Design**: Zoom controls use a compact design suitable for the header area
- **Contextual Controls**: When zoomed in, navigation arrows and time range indicator appear next to the zoom buttons
- **Visual Hierarchy**: Clear separation between main navigation, timeline controls, and action buttons
