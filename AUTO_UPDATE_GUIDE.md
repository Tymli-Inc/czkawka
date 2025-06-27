# Auto-Update Setup Guide

This app now includes Discord-style auto-updates powered by `electron-updater` and AWS CloudFront.

## How it Works

1. **Automatic Checks**: The app checks for updates every 4 hours and 3 seconds after startup
2. **Background Download**: Updates download automatically in the background when available
3. **User Choice**: When an update is ready, users can choose to install immediately or on next restart
4. **Progress Indicator**: Real-time download progress with speed indication

## AWS S3 Structure

Your S3 bucket should contain:
```
bucket-root/
├── latest.yml          # Update metadata
├── HourglassSetup.exe  # Latest installer
└── (other versions)
```

## Required Files in S3

### 1. latest.yml
This file tells the app about available updates:

```yaml
version: 0.0.6
files:
  - url: HourglassSetup.exe
    sha512: [SHA512_HASH_OF_EXE]
    size: [FILE_SIZE_IN_BYTES]
path: HourglassSetup.exe
sha512: [SHA512_HASH_OF_EXE]
releaseDate: '2024-01-15T10:30:00.000Z'
```

### 2. HourglassSetup.exe
The actual installer file that users will download.

## Building and Publishing

1. **Build the app**:
   ```bash
   npm run make
   ```

2. **Generate the installer**:
   The installer will be created in `out/make/squirrel.windows/x64/`

3. **Upload to S3**:
   - Upload the `.exe` file
   - Generate and upload `latest.yml` with correct metadata

4. **CloudFront Distribution**:
   Your CloudFront URL: `https://delbbj6dg6b8e.cloudfront.net`

## Testing Auto-Update

1. **Test in Settings**: Go to Settings > App Updates and click "Check for Updates"
2. **Console Logs**: Check the app logs for update status
3. **Version Numbers**: Ensure the version in `package.json` is lower than what's in `latest.yml`

## Update Process Flow

1. App starts → Check for updates after 3 seconds
2. If update available → Download starts automatically
3. Progress shown in Settings page
4. When complete → User prompted to install
5. User chooses → App restarts with new version

## Features Implemented

- ✅ Automatic update checking
- ✅ Background downloading
- ✅ Progress indicators
- ✅ User notifications
- ✅ Manual update checks
- ✅ Error handling
- ✅ Settings page integration
- ✅ Periodic checks (every 4 hours)

## Settings Page

The Settings page now includes an "App Updates" section showing:
- Current update status
- Download progress (when applicable)
- Manual "Check for Updates" button
- "Install & Restart" button (when update is ready)

## Important Notes

- Updates only work with signed builds in production
- For testing, you can disable code signature verification
- Make sure your CloudFront distribution allows CORS for `.yml` files
- Keep your S3 bucket and CloudFront distribution properly configured

## Troubleshooting

If updates aren't working:
1. Check network connectivity
2. Verify CloudFront URL is accessible
3. Ensure `latest.yml` format is correct
4. Check app logs for error messages
5. Verify version numbers are correct
