# URL Tracking Integration for Hourglass

This feature enhances the Hourglass time tracking application with automatic URL detection and categorization for web browsers.

## How It Works

The URL tracking system automatically detects when you're using a browser and categorizes your time based on the website domain you're visiting.

### Key Features

1. **Automatic Browser Detection**: Detects Chrome, Firefox, Safari, Edge, Opera, Brave, and other popular browsers
2. **Domain-Based Categorization**: Automatically categorizes websites into appropriate categories (Social, Entertainment, Work, Learning, etc.)
3. **Enhanced Window Titles**: Browser windows show both the browser name and the current domain for better tracking
4. **Real-Time URL Polling**: Continuously monitors your current URL via a browser extension API

## How to Use

### 1. Install Browser Extension

First, you need to install the browser extension that provides URL data to the localhost API endpoint:

- The extension should run a local server on `http://localhost:8887`
- It should provide the `/latest-url` endpoint that returns JSON with current URL information

### 2. Expected API Response

The URL tracking service expects this JSON format from your browser extension:

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "eventType": "tab_switched",
  "timestamp": "2025-07-09T10:30:00.000Z"
}
```

### 3. Automatic Categorization

Once set up, the system will automatically:

- Detect when you're using a browser
- Fetch the current URL from your browser extension
- Extract the domain (e.g., "youtube.com")
- Categorize the time accordingly:
  - General browsing: "Chrome" under "Browsers" category
  - YouTube: "Chrome - youtube.com" under "Entertainment" category
  - GitHub: "Chrome - github.com" under "Development" category
  - And so on...

## Supported Categories

The system includes built-in categorization for popular websites:

- **Social Media**: Facebook, Twitter, Instagram, TikTok, LinkedIn, Reddit
- **Entertainment**: YouTube, Netflix, Twitch, Spotify, Disney+
- **Learning**: Coursera, Udemy, Khan Academy, Wikipedia, Medium
- **Development**: GitHub, Stack Overflow, CodePen, Mozilla Developer Network
- **Work**: Gmail, Google Workspace, Office 365, Trello, Slack
- **Communication**: Zoom, Teams, Discord, Telegram

## Configuration

### Domain Mapping

You can extend the domain-to-category mapping by modifying the `domainCategoryMap` in `src/electron/urlTracking.ts`:

```typescript
const domainCategoryMap: { [key: string]: string } = {
  'example.com': 'work',
  'mysite.com': 'learning',
  // Add more mappings as needed
};
```

### Polling Configuration

The URL tracking service polls the browser extension every 2 seconds by default. You can adjust this in `src/electron/urlTracking.ts`:

```typescript
private readonly POLLING_INTERVAL = 2000; // 2 seconds
```

## Troubleshooting

### Common Issues

1. **No URL Data**: Make sure your browser extension is running and accessible at `http://localhost:8887/latest-url`
2. **Categories Not Working**: Check that the domain extraction is working correctly in the logs
3. **Browser Not Detected**: Ensure the browser name is included in the `browserNames` array in `urlTracking.ts`

### Debug Mode

To enable debug logging, uncomment the test code in `main.ts`:

```typescript
// Optional: Test URL tracking (enable for debugging)
import testUrlTracking from './urlTrackingTest';
testUrlTracking();
```

This will run a 10-second test that shows:
- Browser detection results
- Domain categorization
- URL polling functionality

## Files Modified

- `src/electron/urlTracking.ts` - Main URL tracking service
- `src/electron/windowTracking.ts` - Enhanced with URL integration
- `src/electron/main.ts` - Added initialization comments
- `src/electron/urlTrackingTest.ts` - Testing utilities

## Browser Extension Requirements

Your browser extension should:

1. Run a local HTTP server on port 8887
2. Provide a `/latest-url` endpoint
3. Return JSON with current tab URL and metadata
4. Update the data when users switch tabs or navigate

Example browser extension server code:
```javascript
const express = require('express');
const app = express();

let latestUrl = {
  url: 'https://www.google.com',
  eventType: 'tab_switched',
  timestamp: new Date().toISOString()
};

app.get('/latest-url', (req, res) => {
  res.json(latestUrl);
});

app.listen(8887, () => {
  console.log('URL tracking server running on port 8887');
});
```

## Performance Notes

- The URL tracking service is lightweight and runs in the background
- It only makes HTTP requests every 2 seconds when tracking is active
- Failed API calls are logged as debug messages, not errors
- The service automatically stops when window tracking is disabled

## Security Considerations

- The URL tracking only works with localhost (127.0.0.1:8887)
- No external network requests are made
- All URL data remains on your local machine
- The system respects the existing privacy settings of Hourglass
