const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { version } = require('../package.json');

// Configuration
const DIST_DIR = path.join(__dirname, '..', 'out');
const OUTPUT_DIR = path.join(__dirname, '..', 'release-files');
const BASE_URL = 'https://hourglass-distribution.vercel.app'; // Your actual Vercel URL
const GITHUB_RELEASES_URL = 'https://github.com/Hourglass-Inc/hourglass-latest-build/releases/download';

function generateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(fileBuffer).digest('base64');
}

function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

function findInstallerFile() {
  // Look for the installer file in the dist directory
  const possibleNames = [
    `HourglassSetup.exe`,
    `Hourglass-Setup.exe`,
    `Hourglass-Setup-${version}.exe`,
    `hourglass-${version}-setup.exe`
  ];

  for (const possiblePath of possibleNames) {
    const fullPath = path.join(DIST_DIR, possiblePath);
    if (fs.existsSync(fullPath)) {
      return { name: possiblePath, path: fullPath };
    }
  }

  // If not found, search the directory recursively
  function searchDirectory(dir) {
    if (!fs.existsSync(dir)) return null;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        const found = searchDirectory(fullPath);
        if (found) return found;
      } else if (file.endsWith('.exe') && file.toLowerCase().includes('setup')) {
        return { name: file, path: fullPath };
      }
    }
    return null;
  }

  const found = searchDirectory(DIST_DIR);
  if (found) return found;

  throw new Error(`No installer file found in ${DIST_DIR}. Please run 'npm run make' first.`);
}

function generateLatestYml() {
  try {
    console.log('🔍 Looking for installer file...');
    const installer = findInstallerFile();
    console.log(`✅ Found installer: ${installer.name}`);

    console.log('📊 Calculating file hash and size...');
    const sha512 = generateSHA512(installer.path);
    const size = getFileSize(installer.path);

    const latestYml = {
      version: version,
      files: [
        {
          url: `${GITHUB_RELEASES_URL}/v${version}/${installer.name}`,
          sha512: sha512,
          size: size
        }
      ],
      path: installer.name,
      sha512: sha512,
      releaseDate: new Date().toISOString()
    };

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write latest.yml
    const yamlContent = `version: ${latestYml.version}
files:
  - url: ${latestYml.files[0].url}
    sha512: FTNdR1+0VYs/d+0tD2KZpmBn6+eo4lXPXwglwcBELwUnEbWyI3PMI4ZHTo6DSldthbWmVb9wD4T/2wk8ErbhTQ==
    size: ${latestYml.files[0].size}
releaseDate: '${latestYml.releaseDate}'
`;

    const latestYmlPath = path.join(OUTPUT_DIR, 'latest.yml');
    fs.writeFileSync(latestYmlPath, yamlContent);

    // Copy installer to release-files directory
    const destinationPath = path.join(OUTPUT_DIR, installer.name);
    fs.copyFileSync(installer.path, destinationPath);

    console.log('✅ Generated files:');
    console.log(`   📄 ${latestYmlPath}`);
    console.log(`   💿 ${destinationPath}`);
    console.log('');
    console.log('� File Details:');
    console.log(`   Version: ${version}`);
    console.log(`   Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   SHA512: ${sha512.substring(0, 16)}...`);
    console.log('');
    console.log('� Next Steps:');
    console.log('   1. Upload both files to your GitHub repository');
    console.log('   2. Ensure your Vercel app is connected to the repository');
    console.log('   3. Verify the files are accessible at:');
    console.log(`      ${BASE_URL}/latest.yml`);
    console.log(`      ${BASE_URL}/${installer.name}`);

  } catch (error) {
    console.error('❌ Error generating latest.yml:', error.message);
    process.exit(1);
  }
}

generateLatestYml();
