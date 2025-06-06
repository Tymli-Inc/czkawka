const { execSync } = require('child_process');
const path = require('path');

module.exports = async (_forgeConfig, buildResult) => {
    // Determine the platform-specific output directory
    const platformMap = {
    'win32': 'tracker-app-win32-x64',
    'darwin': 'tracker-app-darwin-x64',
    'linux': 'tracker-app-linux-x64'
    };

    const currentPlatform = process.platform;
    const platformDir = platformMap[currentPlatform];

    if (!platformDir) {
    console.error(`❌ Unsupported platform: ${currentPlatform}`);
    process.exit(1);
    }

    const unpackPath = path.resolve(__dirname, `out/${platformDir}/resources/app.asar.unpacked`);

    console.log('📦 Installing get-windows to app.asar.unpacked...');
    execSync(`npm install get-windows --prefix "${unpackPath}"`, { stdio: 'inherit' });
    console.log('✅ Done.');
}

