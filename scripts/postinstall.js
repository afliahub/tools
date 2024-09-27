const { execSync } = require('child_process');

try {
  execSync('electron-builder install-app-deps', { stdio: 'inherit' });

  if (process.platform === 'darwin') {
    execSync('npm install dmg-license', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Error during postinstall:', error);
  process.exit(1);
}