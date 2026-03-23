const path = require('path');
const fs = require('fs');
console.log('=== Path Resolution Test ===');
console.log('process.cwd():', process.cwd());
console.log('Repo root (process.cwd() + ".."):', path.join(process.cwd(), '..'));
const repoRoot = path.join(process.cwd(), '..');
const componentPath = path.join(repoRoot, 'call-center-return/packages/return-shared/src/lib/components/sample-shared.component.ts');
console.log('\n=== Component File ===');
console.log('Full path:', componentPath);
console.log('Exists:', fs.existsSync(componentPath));
const relativePath = path.relative(repoRoot, componentPath);
console.log('Relative to repo root:', relativePath);
// Find package.json
let currentDir = path.dirname(componentPath);
let packageInfo = null;
console.log('\n=== Searching for package.json ===');
while (currentDir !== repoRoot && currentDir.length > repoRoot.length) {
  const packageJsonPath = path.join(currentDir, 'package.json');
  console.log('Checking:', packageJsonPath);
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageInfo = {
      name: packageJson.name,
      path: currentDir
    };
    console.log('✅ Found package.json!');
    console.log('   Package name:', packageInfo.name);
    console.log('   Package path:', packageInfo.path);
    break;
  }
  currentDir = path.dirname(currentDir);
}
if (packageInfo) {
  const publicApiPath = path.join(packageInfo.path, 'src', 'public-api.ts');
  console.log('\n=== public-api.ts ===');
  console.log('Path:', publicApiPath);
  console.log('Exists:', fs.existsSync(publicApiPath));
  if (fs.existsSync(publicApiPath)) {
    const packageSrcDir = path.join(packageInfo.path, 'src');
    const fileRelativeToSrc = path.relative(packageSrcDir, componentPath)
      .replace(/\\/g, '/')
      .replace(/\.(ts|tsx|js|jsx)$/, '');
    console.log('Package src dir:', packageSrcDir);
    console.log('File relative to src:', fileRelativeToSrc);
    const exportLine1 = `export * from './${fileRelativeToSrc}'`;
    const exportLine2 = `export * from "./${fileRelativeToSrc}"`;
    console.log('\n=== Export Lines to Search ===');
    console.log('Line 1:', exportLine1);
    console.log('Line 2:', exportLine2);
    const publicApiContent = fs.readFileSync(publicApiPath, 'utf8');
    console.log('\n=== Search Results ===');
    console.log('Line 1 found:', publicApiContent.includes(exportLine1));
    console.log('Line 2 found:', publicApiContent.includes(exportLine2));
    // Show actual export lines
    console.log('\n=== Actual Export Lines in public-api.ts ===');
    const lines = publicApiContent.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('export') && line.includes('component')) {
        console.log(`Line ${idx + 1}: ${line}`);
      }
    });
  }
}
// Made with Bob
