const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

try {
  //console.log('Navigating to frontend...');
  process.chdir('frontend');

  //console.log('Running ng build...');
  execSync('ng build', { stdio: 'inherit' });

  execSync('ng build', { stdio: 'inherit' });

  //console.log('Returning to the root directory...');
  process.chdir('..');

  //console.log('Running webpack...');
  execSync('webpack', { stdio: 'inherit' });

  //console.log('Changing directory to export...');
  process.chdir('export');

  //console.log('Running ncc build...');
  execSync('ncc build bundle.js -o dist', { stdio: 'inherit' });

  //console.log('Copying "out" and "uploads" folders to "dist"...');
  fs.copySync(path.resolve(__dirname, 'out'), path.resolve('dist', 'out'));
  fs.copySync(path.resolve(__dirname, 'uploads'), path.resolve('dist', 'uploads'));
  //console.log('Folders copied successfully.');

  //console.log('Changing directory to dist...');
  process.chdir('dist');

  //console.log('Running pkg...');
  execSync('pkg index.js --targets node16-win-x64', { stdio: 'inherit' });

  //console.log('All commands executed successfully.');
} catch (error) {
  console.error('An error occurred:', error.message);
  process.exit(1);
}
