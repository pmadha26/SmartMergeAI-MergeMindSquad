#!/usr/bin/env node

/**
 * Validate a specific commit
 * Usage: node scripts/validate-commit.js <commit-hash>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const commitHash = process.argv[2] || 'HEAD';

console.log(`\n🔍 Validating commit: ${commitHash}\n`);

try {
  // Get the files changed in this commit
  const changedFiles = execSync(`git show ${commitHash} --name-only --pretty=format:""`, { 
    encoding: 'utf-8' 
  })
    .trim()
    .split('\n')
    .filter(f => f);

  console.log(`📁 Files changed in commit:\n`);
  changedFiles.forEach(file => console.log(`   - ${file}`));
  console.log();

  // Check each TypeScript file for issues
  const errors = [];
  const warnings = [];

  for (const file of changedFiles) {
    if ((file.endsWith('.ts') || file.endsWith('.tsx')) && fs.existsSync(file)) {
      console.log(`🔎 Analyzing: ${file}`);
      
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for missing imports
      const issues = checkMissingImports(content, file);
      errors.push(...issues.errors);
      warnings.push(...issues.warnings);

      // Check if imported files exist
      const fileIssues = checkImportedFilesExist(content, file);
      errors.push(...fileIssues.errors);
      warnings.push(...fileIssues.warnings);
    }
  }

  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('📊 Validation Results');
  console.log('='.repeat(80) + '\n');

  if (errors.length > 0) {
    console.log(`❌ Errors found: ${errors.length}\n`);
    errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error.file}:${error.line || '?'}`);
      console.log(`   ${error.message}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Warnings: ${warnings.length}\n`);
    warnings.forEach((warning, i) => {
      console.log(`${i + 1}. ${warning.file}`);
      console.log(`   ${warning.message}\n`);
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No issues found!\n');
  }

  console.log('='.repeat(80) + '\n');

  process.exit(errors.length > 0 ? 1 : 0);

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}

function checkMissingImports(content, file) {
  const errors = [];
  const warnings = [];
  const lines = content.split('\n');

  // Extract used identifiers (components, classes, etc.)
  const usedIdentifiers = new Set();
  
  // Pattern 1: components: [Component1, Component2]
  const componentArrayMatch = content.match(/components\s*[:=]\s*\[([\s\S]*?)\]/);
  if (componentArrayMatch) {
    const components = componentArrayMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s && /^[A-Z]/.test(s));
    
    components.forEach(comp => {
      const match = comp.match(/^([A-Z][a-zA-Z0-9]*)/);
      if (match) usedIdentifiers.add(match[1]);
    });
  }

  // Pattern 2: providers: [Service1, Service2]
  const providerArrayMatch = content.match(/providers\s*[:=]\s*\[([\s\S]*?)\]/);
  if (providerArrayMatch) {
    const providers = providerArrayMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s && /^[A-Z]/.test(s));
    
    providers.forEach(prov => {
      const match = prov.match(/^([A-Z][a-zA-Z0-9]*)/);
      if (match) usedIdentifiers.add(match[1]);
    });
  }

  // Pattern 3: new ClassName()
  const newMatches = content.matchAll(/\bnew\s+([A-Z][a-zA-Z0-9]*)/g);
  for (const match of newMatches) {
    usedIdentifiers.add(match[1]);
  }

  // Extract imported identifiers
  const importedIdentifiers = new Set();
  
  // Import patterns
  const importMatches = content.matchAll(/import\s+{([^}]+)}\s+from/g);
  for (const match of importMatches) {
    const imports = match[1].split(',').map(s => s.trim());
    imports.forEach(imp => {
      const identifier = imp.match(/^([A-Z][a-zA-Z0-9]*)/);
      if (identifier) importedIdentifiers.add(identifier[1]);
    });
  }

  // Default imports
  const defaultImports = content.matchAll(/import\s+([A-Z][a-zA-Z0-9]*)\s+from/g);
  for (const match of defaultImports) {
    importedIdentifiers.add(match[1]);
  }

  // Check for class/interface definitions in same file
  const definitions = content.matchAll(/(?:export\s+)?(?:class|interface|enum)\s+([A-Z][a-zA-Z0-9]*)/g);
  for (const match of definitions) {
    importedIdentifiers.add(match[1]);
  }

  // Built-in types
  const builtIns = new Set([
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
    'Promise', 'Map', 'Set', 'Component', 'NgModule', 'Injectable'
  ]);

  // Check for missing imports
  usedIdentifiers.forEach(identifier => {
    if (!importedIdentifiers.has(identifier) && !builtIns.has(identifier)) {
      const lineNumber = lines.findIndex(line => 
        new RegExp(`\\b${identifier}\\b`).test(line)
      ) + 1;

      errors.push({
        file,
        line: lineNumber,
        message: `Missing import for '${identifier}' - component/class is used but not imported`
      });
    }
  });

  return { errors, warnings };
}

function checkImportedFilesExist(content, file) {
  const errors = [];
  const warnings = [];
  const lines = content.split('\n');
  const fileDir = path.dirname(file);

  lines.forEach((line, index) => {
    // Check import statements
    const importMatch = /import\s+.*\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (importMatch) {
      const importPath = importMatch[1];
      const resolvedPath = resolveImportPath(importPath, fileDir);
      
      // Only report error if we got a resolved path (skip actual node_modules)
      if (resolvedPath && !fs.existsSync(resolvedPath)) {
        errors.push({
          file,
          line: index + 1,
          message: `Imported file does not exist: '${importPath}' (resolved to: ${resolvedPath})`
        });
      }
    }

    // Check require statements
    const requireMatch = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(line);
    if (requireMatch) {
      const requirePath = requireMatch[1];
      const resolvedPath = resolveImportPath(requirePath, fileDir);
      
      if (resolvedPath && !fs.existsSync(resolvedPath)) {
        errors.push({
          file,
          line: index + 1,
          message: `Required file does not exist: '${requirePath}' (resolved to: ${resolvedPath})`
        });
      }
    }
  });

  return { errors, warnings };
}

function resolveImportPath(importPath, fromDir) {
  const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
  
  // Handle relative imports (./file or ../file)
  if (importPath.startsWith('.')) {
    for (const ext of possibleExtensions) {
      const fullPath = path.resolve(fromDir, importPath + ext);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    // Return the resolved path even if it doesn't exist (for error reporting)
    return path.resolve(fromDir, importPath + '.ts');
  }
  
  // Handle absolute paths from workspace root (/path or path without ./)
  if (importPath.startsWith('/') || (!importPath.startsWith('.') && !importPath.startsWith('@'))) {
    // Check if it's a workspace-relative path (like packages/...)
    const workspaceRoot = process.cwd();
    
    // Try from workspace root
    for (const ext of possibleExtensions) {
      const fullPath = path.resolve(workspaceRoot, importPath + ext);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    // Check if it's a monorepo package path
    // For paths like "packages/create-return/src/..."
    if (importPath.includes('/')) {
      const parts = importPath.split('/');
      
      // Try common monorepo patterns
      const monorepoPatterns = [
        importPath, // Direct path
        `call-center-return/${importPath}`, // With project prefix
      ];
      
      for (const pattern of monorepoPatterns) {
        for (const ext of possibleExtensions) {
          const fullPath = path.resolve(workspaceRoot, pattern + ext);
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
      }
      
      // Return the resolved path for error reporting
      return path.resolve(workspaceRoot, importPath + '.ts');
    }
    
    // If it looks like a package name (no slashes or starts with @), skip it
    if (!importPath.includes('/') || importPath.startsWith('@')) {
      return null; // This is a node_modules import
    }
    
    // Return resolved path for error reporting
    return path.resolve(workspaceRoot, importPath + '.ts');
  }

  return null; // Skip node_modules imports
}


