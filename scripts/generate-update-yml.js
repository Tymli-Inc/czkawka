const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate latest.yml for auto-updater
 * Usage: node scripts/generate-update-yml.js <exe-file-path> <version>
 */

function generateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha512');
  hashSum.update(fileBuffer);
  return hashSum.digest('base64');
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function generateUpdateYml(exeFilePath, version) {
  if (!fs.existsSync(exeFilePath)) {
    console.error('Error: EXE file not found:', exeFilePath);
    process.exit(1);
  }

  const fileName = path.basename(exeFilePath);
  const sha512 = generateSHA512(exeFilePath);
  const size = getFileSize(exeFilePath);
  const releaseDate = new Date().toISOString();

  const ymlContent = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha512}
    size: ${size}
path: ${fileName}
sha512: ${sha512}
releaseDate: '${releaseDate}'
`;

  const outputPath = path.join(process.cwd(), 'latest.yml');
  fs.writeFileSync(outputPath, ymlContent);
  
  console.log('✅ Generated latest.yml successfully!');
  console.log('📄 File:', outputPath);
  console.log('📦 Version:', version);
  console.log('🔐 SHA512:', sha512);
  console.log('📊 Size:', size, 'bytes');
  console.log('📅 Release Date:', releaseDate);
  console.log('\n📋 Upload both files to your S3 bucket:');
  console.log(`   1. ${fileName}`);
  console.log('   2. latest.yml');
}

// Command line usage
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node scripts/generate-update-yml.js <exe-file-path> <version>');
  console.log('Example: node scripts/generate-update-yml.js ./out/make/squirrel.windows/x64/HourglassSetup.exe 0.0.6');
  process.exit(1);
}

const [exeFilePath, version] = args;
generateUpdateYml(exeFilePath, version);
