#!/usr/bin/env node

/**
 * Commit Impact Validator
 * 
 * This script validates git commits to ensure changes won't break functionality by checking:
 * 1. Missing imports for referenced components/classes
 * 2. Removed package.json dependencies that are still in use
 * 3. Broken file references
 * 4. Unused imports after deletions
 * 5. TypeScript/Angular specific validations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class CommitImpactValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.changedFiles = [];
    this.deletedFiles = [];
    this.addedFiles = [];
    this.modifiedFiles = [];
  }

  /**
   * Main validation entry point
   */
  async validate() {
    console.log(`${colors.bold}${colors.cyan}🔍 Commit Impact Validator${colors.reset}\n`);

    try {
      // Get changed files from git
      this.getChangedFiles();

      // Run all validation checks
      await this.checkMissingImports();
      await this.checkImportedFilesExist();
      await this.checkPackageJsonDependencies();
      await this.checkBrokenReferences();
      await this.checkUnusedImports();
      await this.checkAngularModuleIntegrity();
      await this.checkTypeScriptCompilation();

      // Display results
      this.displayResults();

      // Exit with appropriate code
      if (this.errors.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`${colors.red}❌ Validation failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  /**
   * Get list of changed files from git
   */
  getChangedFiles() {
    try {
      // Get staged files
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .filter(f => f);

      // Get status of each file
      const statusOutput = execSync('git diff --cached --name-status', { encoding: 'utf-8' })
        .trim()
        .split('\n');

      statusOutput.forEach(line => {
        const [status, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');

        if (status === 'D') {
          this.deletedFiles.push(file);
        } else if (status === 'A') {
          this.addedFiles.push(file);
        } else if (status === 'M') {
          this.modifiedFiles.push(file);
        }
      });

      this.changedFiles = stagedFiles;

      console.log(`${colors.blue}📁 Changed files: ${this.changedFiles.length}${colors.reset}`);
      console.log(`   Added: ${this.addedFiles.length}, Modified: ${this.modifiedFiles.length}, Deleted: ${this.deletedFiles.length}\n`);
    } catch (error) {
      // If no staged files, check working directory
      try {
        const workingFiles = execSync('git diff --name-only', { encoding: 'utf-8' })
          .trim()
          .split('\n')
          .filter(f => f);

        this.changedFiles = workingFiles;
        this.modifiedFiles = workingFiles;

        console.log(`${colors.yellow}⚠️  No staged files. Checking working directory changes: ${this.changedFiles.length}${colors.reset}\n`);
      } catch (err) {
        console.log(`${colors.yellow}⚠️  No git changes detected${colors.reset}\n`);
      }
    }
  }

  /**
   * Check for missing imports in TypeScript/JavaScript files
   */
  async checkMissingImports() {
    console.log(`${colors.cyan}🔎 Checking for missing imports...${colors.reset}`);

    const tsFiles = this.changedFiles.filter(f => 
      (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) &&
      fs.existsSync(f)
    );

    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Extract all identifiers used in the file
        const usedIdentifiers = this.extractUsedIdentifiers(content);
        
        // Extract all imported identifiers
        const importedIdentifiers = this.extractImportedIdentifiers(content);

        // Check for missing imports
        usedIdentifiers.forEach(identifier => {
          if (!importedIdentifiers.has(identifier) && !this.isBuiltIn(identifier)) {
            // Find the line number where it's used
            const lineNumber = lines.findIndex(line => 
              new RegExp(`\\b${identifier}\\b`).test(line)
            ) + 1;

            this.errors.push({
              file,
              line: lineNumber,
              message: `Missing import for '${identifier}'`,
              type: 'missing-import'
            });
          }
        });
      } catch (error) {
        this.warnings.push({
          file,
          message: `Could not analyze file: ${error.message}`,
          type: 'analysis-error'
        });
      }
    }
  }

  /**
   * Check if imported files actually exist in the repository
   */
  async checkImportedFilesExist() {
    console.log(`${colors.cyan}📂 Checking if imported files exist...${colors.reset}`);

    const tsFiles = this.changedFiles.filter(f =>
      (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) &&
      fs.existsSync(f)
    );

    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = this.extractImportPaths(content);
        const fileDir = path.dirname(file);

        imports.forEach(imp => {
          // Resolve the import path
          let resolvedPath = this.resolveImportPath(imp.path, fileDir);
          
          // Only validate if we got a resolved path (skip actual node_modules)
          if (resolvedPath && !fs.existsSync(resolvedPath)) {
            this.errors.push({
              file,
              line: imp.line,
              message: `Imported file does not exist: '${imp.path}' (resolved to: ${resolvedPath})`,
              type: 'missing-file'
            });
          }
        });
      } catch (error) {
        this.warnings.push({
          file,
          message: `Could not check imports: ${error.message}`,
          type: 'import-check-error'
        });
      }
    }
  }

  /**
   * Extract import paths from file content
   */
  extractImportPaths(content) {
    const imports = [];
    const lines = content.split('\n');

    // Match various import patterns
    const importPatterns = [
      /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,  // import ... from 'path'
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,   // require('path')
    ];

    lines.forEach((line, index) => {
      importPatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, 'g');
        while ((match = regex.exec(line)) !== null) {
          imports.push({
            path: match[1],
            line: index + 1
          });
        }
      });
    });

    return imports;
  }

  /**
   * Resolve import path to actual file path
   */
  resolveImportPath(importPath, fromDir) {
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

  /**
   * Extract identifiers used in code (classes, functions, components)
   */
  extractUsedIdentifiers(content) {
    const identifiers = new Set();

    // Match class/component usage patterns
    const patterns = [
      /\bcomponents\s*[:=]\s*\[([\s\S]*?)\]/g,  // components: [Component1, Component2]
      /\bproviders\s*[:=]\s*\[([\s\S]*?)\]/g,   // providers: [Service1, Service2]
      /\bimports\s*[:=]\s*\[([\s\S]*?)\]/g,     // imports: [Module1, Module2]
      /\bnew\s+([A-Z][a-zA-Z0-9]*)/g,           // new ClassName()
      /\bextends\s+([A-Z][a-zA-Z0-9]*)/g,       // extends BaseClass
      /\bimplements\s+([A-Z][a-zA-Z0-9]*)/g,    // implements Interface
      /<([A-Z][a-zA-Z0-9]*)/g,                  // <ComponentName>
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          // Extract individual identifiers from arrays
          const items = match[1].split(',').map(s => s.trim());
          items.forEach(item => {
            const identifier = item.match(/^([A-Z][a-zA-Z0-9]*)/);
            if (identifier) {
              identifiers.add(identifier[1]);
            }
          });
        }
      }
    });

    return identifiers;
  }

  /**
   * Extract imported identifiers from import statements
   */
  extractImportedIdentifiers(content) {
    const imported = new Set();

    // Match various import patterns
    const importPatterns = [
      /import\s+{([^}]+)}\s+from/g,              // import { A, B } from
      /import\s+([A-Z][a-zA-Z0-9]*)\s+from/g,    // import Component from
      /import\s+\*\s+as\s+([A-Z][a-zA-Z0-9]*)/g, // import * as Name
    ];

    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const items = match[1].split(',').map(s => s.trim());
          items.forEach(item => {
            const identifier = item.match(/^([A-Z][a-zA-Z0-9]*)/);
            if (identifier) {
              imported.add(identifier[1]);
            }
          });
        }
      }
    });

    // Also check for class/interface definitions in the same file
    const definitionPatterns = [
      /export\s+class\s+([A-Z][a-zA-Z0-9]*)/g,
      /export\s+interface\s+([A-Z][a-zA-Z0-9]*)/g,
      /export\s+enum\s+([A-Z][a-zA-Z0-9]*)/g,
    ];

    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imported.add(match[1]);
      }
    });

    return imported;
  }

  /**
   * Check if identifier is a built-in or common type
   */
  isBuiltIn(identifier) {
    const builtIns = new Set([
      'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
      'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Error', 'Function',
      'Symbol', 'Proxy', 'Reflect', 'JSON', 'Math', 'Console',
      // Angular common
      'Component', 'NgModule', 'Injectable', 'Directive', 'Pipe',
      'Input', 'Output', 'EventEmitter', 'OnInit', 'OnDestroy',
      'ViewChild', 'ContentChild', 'HostListener', 'HostBinding'
    ]);

    return builtIns.has(identifier);
  }

  /**
   * Check package.json dependencies
   */
  async checkPackageJsonDependencies() {
    console.log(`${colors.cyan}📦 Checking package.json dependencies...${colors.reset}`);

    const packageJsonFiles = this.changedFiles.filter(f => f.endsWith('package.json'));

    for (const pkgFile of packageJsonFiles) {
      try {
        // Get the diff for this package.json
        const diff = execSync(`git diff --cached ${pkgFile}`, { encoding: 'utf-8' });
        
        // Find removed dependencies
        const removedDeps = this.extractRemovedDependencies(diff);

        if (removedDeps.length > 0) {
          // Check if these dependencies are still used in the codebase
          for (const dep of removedDeps) {
            const isUsed = await this.isDependencyUsed(dep);
            if (isUsed) {
              this.errors.push({
                file: pkgFile,
                message: `Dependency '${dep}' was removed but is still used in the codebase`,
                type: 'missing-dependency'
              });
            } else {
              this.info.push({
                file: pkgFile,
                message: `Dependency '${dep}' removed (appears unused)`,
                type: 'dependency-removed'
              });
            }
          }
        }
      } catch (error) {
        // File might be new or deleted
      }
    }
  }

  /**
   * Extract removed dependencies from git diff
   */
  extractRemovedDependencies(diff) {
    const removed = [];
    const lines = diff.split('\n');

    lines.forEach(line => {
      if (line.startsWith('-') && !line.startsWith('---')) {
        const match = line.match(/["-]\s*"([^"]+)"\s*:/);
        if (match && !line.includes('version') && !line.includes('description')) {
          removed.push(match[1]);
        }
      }
    });

    return removed;
  }

  /**
   * Check if a dependency is used in the codebase
   */
  async isDependencyUsed(dependency) {
    try {
      // Search for import statements using this dependency
      const result = execSync(
        `git grep -l "from ['\"]${dependency}" -- "*.ts" "*.js" "*.tsx" "*.jsx"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return result.trim().length > 0;
    } catch (error) {
      // grep returns non-zero if no matches found
      return false;
    }
  }

  /**
   * Check for broken file references
   */
  async checkBrokenReferences() {
    console.log(`${colors.cyan}🔗 Checking for broken references...${colors.reset}`);

    // Check if deleted files are still referenced
    for (const deletedFile of this.deletedFiles) {
      try {
        // Search for imports of this file
        const fileName = path.basename(deletedFile, path.extname(deletedFile));
        const result = execSync(
          `git grep -l "from ['\"].*${fileName}" -- "*.ts" "*.js" "*.tsx" "*.jsx"`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );

        if (result.trim()) {
          const referencingFiles = result.trim().split('\n');
          referencingFiles.forEach(file => {
            this.errors.push({
              file,
              message: `References deleted file '${deletedFile}'`,
              type: 'broken-reference'
            });
          });
        }
      } catch (error) {
        // No references found (which is good)
      }
    }
  }

  /**
   * Check for unused imports after deletions
   */
  async checkUnusedImports() {
    console.log(`${colors.cyan}🧹 Checking for unused imports...${colors.reset}`);

    const tsFiles = this.modifiedFiles.filter(f => 
      (f.endsWith('.ts') || f.endsWith('.tsx')) && fs.existsSync(f)
    );

    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = this.extractImports(content);

        imports.forEach(imp => {
          // Check if the imported identifier is actually used
          const isUsed = new RegExp(`\\b${imp.identifier}\\b`).test(
            content.replace(/import.*from.*$/gm, '') // Remove import lines
          );

          if (!isUsed) {
            this.warnings.push({
              file,
              message: `Unused import '${imp.identifier}' from '${imp.source}'`,
              type: 'unused-import'
            });
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  /**
   * Extract imports from file content
   */
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const identifiers = match[1].split(',').map(s => s.trim());
      identifiers.forEach(identifier => {
        imports.push({
          identifier: identifier.split(' as ')[0].trim(),
          source: match[2]
        });
      });
    }

    return imports;
  }

  /**
   * Check Angular module integrity
   */
  async checkAngularModuleIntegrity() {
    console.log(`${colors.cyan}🅰️  Checking Angular module integrity...${colors.reset}`);

    const moduleFiles = this.changedFiles.filter(f => 
      f.endsWith('.module.ts') && fs.existsSync(f)
    );

    for (const file of moduleFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for components declared but not imported
        const declaredComponents = this.extractArrayItems(content, 'declarations');
        const importedIdentifiers = this.extractImportedIdentifiers(content);

        declaredComponents.forEach(component => {
          if (!importedIdentifiers.has(component)) {
            this.errors.push({
              file,
              message: `Component '${component}' declared but not imported`,
              type: 'module-integrity'
            });
          }
        });

        // Check for providers
        const providers = this.extractArrayItems(content, 'providers');
        providers.forEach(provider => {
          if (!importedIdentifiers.has(provider)) {
            this.errors.push({
              file,
              message: `Provider '${provider}' declared but not imported`,
              type: 'module-integrity'
            });
          }
        });
      } catch (error) {
        // Skip files that can't be analyzed
      }
    }
  }

  /**
   * Extract items from NgModule arrays (declarations, providers, imports)
   */
  extractArrayItems(content, arrayName) {
    const items = [];
    const regex = new RegExp(`${arrayName}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'g');
    const match = regex.exec(content);

    if (match && match[1]) {
      const itemsStr = match[1];
      const itemMatches = itemsStr.match(/[A-Z][a-zA-Z0-9]*/g);
      if (itemMatches) {
        items.push(...itemMatches);
      }
    }

    return items;
  }

  /**
   * Check TypeScript compilation (if tsc is available)
   */
  async checkTypeScriptCompilation() {
    console.log(`${colors.cyan}⚙️  Checking TypeScript compilation...${colors.reset}`);

    try {
      // Check if TypeScript is available
      execSync('npx tsc --version', { stdio: 'ignore' });

      // Try to compile changed TypeScript files
      const tsFiles = this.changedFiles.filter(f => f.endsWith('.ts') && fs.existsSync(f));

      if (tsFiles.length > 0) {
        try {
          execSync(`npx tsc --noEmit ${tsFiles.join(' ')}`, { 
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          this.info.push({
            message: 'TypeScript compilation check passed',
            type: 'compilation-success'
          });
        } catch (error) {
          const output = error.stdout || error.stderr || '';
          this.errors.push({
            message: `TypeScript compilation errors detected:\n${output}`,
            type: 'compilation-error'
          });
        }
      }
    } catch (error) {
      // TypeScript not available, skip this check
      this.info.push({
        message: 'TypeScript not available, skipping compilation check',
        type: 'compilation-skipped'
      });
    }
  }

  /**
   * Display validation results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}${colors.cyan}📊 Validation Results${colors.reset}`);
    console.log('='.repeat(80) + '\n');

    // Display errors
    if (this.errors.length > 0) {
      console.log(`${colors.bold}${colors.red}❌ Errors (${this.errors.length}):${colors.reset}`);
      this.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${colors.red}${error.type}${colors.reset}`);
        if (error.file) {
          console.log(`   File: ${colors.yellow}${error.file}${error.line ? `:${error.line}` : ''}${colors.reset}`);
        }
        console.log(`   ${error.message}`);
      });
      console.log();
    }

    // Display warnings
    if (this.warnings.length > 0) {
      console.log(`${colors.bold}${colors.yellow}⚠️  Warnings (${this.warnings.length}):${colors.reset}`);
      this.warnings.forEach((warning, index) => {
        console.log(`\n${index + 1}. ${colors.yellow}${warning.type}${colors.reset}`);
        if (warning.file) {
          console.log(`   File: ${colors.cyan}${warning.file}${colors.reset}`);
        }
        console.log(`   ${warning.message}`);
      });
      console.log();
    }

    // Display info
    if (this.info.length > 0 && this.errors.length === 0) {
      console.log(`${colors.bold}${colors.blue}ℹ️  Information:${colors.reset}`);
      this.info.forEach(info => {
        console.log(`   • ${info.message}`);
      });
      console.log();
    }

    // Summary
    console.log('='.repeat(80));
    if (this.errors.length === 0) {
      console.log(`${colors.bold}${colors.green}✅ Validation passed! No critical issues found.${colors.reset}`);
    } else {
      console.log(`${colors.bold}${colors.red}❌ Validation failed! Please fix the errors above.${colors.reset}`);
    }
    console.log('='.repeat(80) + '\n');
  }
}

// Run the validator
if (require.main === module) {
  const validator = new CommitImpactValidator();
  validator.validate().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = CommitImpactValidator;


