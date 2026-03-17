#!/usr/bin/env node

console.log('=== Path Debug Info ===');
console.log('process.cwd():', process.cwd());
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);

const fs = require('fs');
const path = require('path');

// Try to find comprehensive-validation-report.json
const locations = [
  'comprehensive-validation-report.json',
  './comprehensive-validation-report.json',
  '../comprehensive-validation-report.json',
  'scripts/comprehensive-validation-report.json',
  path.join(process.cwd(), 'comprehensive-validation-report.json'),
  path.join(__dirname, 'comprehensive-validation-report.json')
];

console.log('\n=== Checking file locations ===');
locations.forEach(loc => {
  const exists = fs.existsSync(loc);
  console.log(`${exists ? '✓' : '✗'} ${loc}`);
});

console.log('\n=== Files in current directory ===');
try {
  const files = fs.readdirSync(process.cwd());
  files.filter(f => f.includes('validation') || f.includes('report')).forEach(f => {
    console.log(`  - ${f}`);
  });
} catch (e) {
  console.log('Error reading directory:', e.message);
}

console.log('\n=== Files in scripts directory ===');
try {
  const scriptsPath = path.join(process.cwd(), 'scripts');
  if (fs.existsSync(scriptsPath)) {
    const files = fs.readdirSync(scriptsPath);
    files.filter(f => f.includes('validation') || f.includes('report')).forEach(f => {
      console.log(`  - ${f}`);
    });
  }
} catch (e) {
  console.log('Error reading scripts directory:', e.message);
}

// Made with Bob
