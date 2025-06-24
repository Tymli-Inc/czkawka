const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
function createStartMenuShortcut() {
  const appPath = process.execPath;
  const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  const shortcutPath = path.join(startMenuPath, 'Hourglass.lnk');
  
  const psScript = `
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
    $Shortcut.TargetPath = "${appPath}"
    $Shortcut.WorkingDirectory = "${path.dirname(appPath)}"
    $Shortcut.IconLocation = "${appPath},0"
    $Shortcut.Description = "Hourglass Time Tracking Application"
    $Shortcut.Save()
  `;
  
  const powershell = spawn('powershell.exe', ['-Command', psScript], {
    stdio: 'inherit'
  });
  
  powershell.on('close', (code) => {
    if (code === 0) {
      console.log('Start Menu shortcut created successfully');
    } else {
      console.log('Failed to create Start Menu shortcut');
    }
  });
}

if (process.argv.includes('--squirrel-install') || process.argv.includes('--squirrel-updated')) {
  createStartMenuShortcut();
  process.exit(0);
}

module.exports = { createStartMenuShortcut };
