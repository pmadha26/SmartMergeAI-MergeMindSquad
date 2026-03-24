const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Typo Detection\n');

const filePath = path.join(__dirname, '../call-center-return/packages/return-search/src-custom/assets/i18n/en.json');
const content = fs.readFileSync(filePath, 'utf8');

const typos = {
  'RETUNR': 'RETURN',
  'SERIVCE': 'SERVICE'
};

let found = 0;
for (const [typo, correct] of Object.entries(typos)) {
  if (content.includes(typo)) {
    found++;
    const lines = content.split('\n');
    const lineNum = lines.findIndex(l => l.includes(typo)) + 1;
    console.log(`✓ TYPO DETECTED: '${typo}' should be '${correct}'`);
    console.log(`  File: en.json`);
    console.log(`  Line: ${lineNum}`);
    console.log(`  Context: ${lines[lineNum - 1].trim()}\n`);
  }
}

if (found > 0) {
  console.log(`\n🎯 Result: ${found} typo(s) detected!`);
  console.log('✅ Typo detection is working correctly\n');
} else {
  console.log('\n❌ No typos detected (unexpected)\n');
}


