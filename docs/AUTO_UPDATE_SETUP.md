# Auto-Update Setup with Vercel + GitHub

This document explains how to set up auto-updates for your Hourglass Electron app using Vercel to serve the update files from a GitHub repository.

## Overview

The auto-update system now uses:
- **GitHub Repository**: To store the built application files and `latest.yml`
- **Vercel**: To serve these files publicly with a CDN
- **electron-updater**: To handle the update logic in the app

## Setup Instructions

### 1. Create a Public GitHub Repository

Create a public GitHub repository to store your release files. For example:
```
https://github.com/yourusername/hourglass-releases
```

### 2. Repository Structure

Your repository should have this structure:
```
hourglass-releases/
├── latest.yml
├── Hourglass-Setup-0.0.5.exe
├── Hourglass-Setup-0.0.6.exe
└── README.md
```

### 3. Generate Release Files

When you build your app with `npm run make`, you'll get:
- `HourglassSetup.exe` (or similar installer)
- `latest.yml` (update metadata)

### 4. Update latest.yml

The `latest.yml` file should look like this:
```yaml
version: 0.0.6
files:
  - url: Hourglass-Setup-0.0.6.exe
    sha512: [generated-hash]
    size: [file-size]
path: Hourglass-Setup-0.0.6.exe
sha512: [generated-hash]
releaseDate: '2025-06-28T10:30:00.000Z'
```

### 5. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Deploy the repository as a static site
3. Your files will be available at: `https://your-app.vercel.app/`

### 6. Update App Configuration

Update the URL in your app configuration:

**package.json:**
```json
{
  "build": {
    "publish": [
      {
        "provider": "generic",
        "url": "https://your-app.vercel.app"
      }
    ]
  }
}
```

**src/electron/autoUpdate.ts:**
```typescript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-app.vercel.app'
});
```

## Release Process

1. **Build the app**: `npm run make`
2. **Copy files**: Copy the generated `.exe` and `latest.yml` to your GitHub repository
3. **Update latest.yml**: Ensure it points to the correct file and has the right version
4. **Commit and push**: Push the changes to GitHub
5. **Vercel auto-deploys**: Vercel will automatically deploy the updated files

## Testing Updates

### Development Testing
The auto-updater is disabled in development mode. To test:
1. Build and package your app
2. Install the packaged version
3. Create a newer version and upload to your repository
4. Run the installed app to test the update process

### Production Flow
1. User opens the app
2. App automatically checks for updates after 2 seconds
3. If update is available, it downloads automatically
4. User is notified when download is complete
5. User can choose to install immediately or later

## Auto-Update Behavior

### On App Startup
- Checks for updates automatically after 2 seconds
- Shows "Checking for updates..." message in the UI
- Downloads updates automatically if available

### Periodic Checks
- Checks for updates every 4 hours
- Silent check unless update is found

### User Experience
- **Checking**: Shows spinner with "Checking for updates..." message
- **Downloading**: Shows progress bar with download speed and percentage
- **Ready**: Shows "Install & Restart" button
- **Up to date**: Shows green checkmark with "App is up to date"
- **Error**: Shows error message with retry button

## File Structure Example

### Your Vercel Repository (hourglass-releases)
```
/
├── latest.yml
├── Hourglass-Setup-0.0.5.exe
├── Hourglass-Setup-0.0.6.exe
└── index.html (optional, for a landing page)
```

### latest.yml Format
```yaml
version: 0.0.6
files:
  - url: Hourglass-Setup-0.0.6.exe
    sha512: ABC123...
    size: 85234567
path: Hourglass-Setup-0.0.6.exe
sha512: ABC123...
releaseDate: '2025-06-28T10:30:00.000Z'
```

## Security Notes

1. **HTTPS Required**: Vercel automatically provides HTTPS
2. **File Integrity**: The SHA512 hash ensures file integrity
3. **Code Signing**: Consider code signing your executables for Windows SmartScreen
4. **Repository Security**: Keep your release repository public but monitor access

## Troubleshooting

### Common Issues

1. **404 Errors**: Ensure files are properly uploaded to GitHub and Vercel has deployed
2. **Update Not Found**: Check that `latest.yml` has the correct file URLs
3. **Download Fails**: Verify file permissions and SHA512 hashes
4. **App Won't Install**: Check code signing and Windows SmartScreen settings

### Debug Mode
Enable debug logging in development:
```typescript
autoUpdater.logger = log;
log.transports.file.level = 'debug';
```

### Manual Testing
You can manually trigger update checks from the Settings page using the "Check for Updates" button.

## URL Configuration

Replace `https://your-app.vercel.app` with your actual Vercel deployment URL in:
- `package.json` (build.publish.url)
- `src/electron/autoUpdate.ts` (setFeedURL)

The app will then automatically check for updates from your Vercel-hosted GitHub repository.
