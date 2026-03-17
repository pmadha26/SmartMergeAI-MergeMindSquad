#!/usr/bin/env node

/**
 * Local test script to verify validators work
 * Run this to test validators before pushing
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Validators Locally\n');

const testFile = 'call-center-return/packages/return-search/src-custom/app/app-customization.impl.ts';

console.log(`Testing file: ${testFile}\n`);

try {
  // Test comprehensive validator
  console.log('=== Running Comprehensive Validator ===');
  execSync('node comprehensive-validator.js --base=origin/main --head=HEAD --cwd=.. --output=../test-validation.json', {
    cwd: path.join(__dirname),
    stdio: 'inherit'
  });
} catch (error) {
  console.log('Validator detected issues (expected)\n');
}

try {
  // Test missing reference detector
  console.log('\n=== Running Missing Reference Detector ===');
  execSync('node missing-reference-detector.js --base=origin/main --head=HEAD', {
    cwd: path.join(__dirname),
    stdio: 'inherit'
  });
} catch (error) {
  console.log('Detector found missing references (expected)\n');
}

console.log('\n✅ Test complete - check output above');

// Made with Bob
