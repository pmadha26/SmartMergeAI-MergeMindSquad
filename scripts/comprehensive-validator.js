#!/usr/bin/env node

/**
 * Comprehensive PR Validator
 * 
 * Detects:
 * 1. Typos in identifiers, keys, and variable names
 * 2. Missing files referenced in code
 * 3. Translation key mismatches
 * 4. Hardcoded strings that should be translated
 * 5. Inconsistent naming patterns
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class ComprehensiveValidator {
  constructor(options = {}) {
    this.baseRef = options.base || 'origin/main';
    this.headRef = options.head || 'HEAD';
    this.workingDir = options.cwd || process.cwd();
    this.outputPath = options.output || path.join(process.cwd(), 'comprehensive-validation-report.json');
    
    this.issues = [];
    this.changedFiles = [];
    
    // Common typos dictionary
    this.typoPatterns = {
      'RETUNR': 'RETURN',
      'SERIVCE': 'SERVICE',
      'RECIEVE': 'RECEIVE',
      'SEPERATE': 'SEPARATE',
      'OCCURED': 'OCCURRED',
      'DEFINATELY': 'DEFINITELY',
      'ACCOMODATE': 'ACCOMMODATE'
    };
  }

  async validate() {
    console.log(`${colors.bold}${colors.cyan}🔍 Comprehensive PR Validator${colors.reset}\n`);
    
    try {
      // Get changed files
      this.getChangedFiles();
      
      // Run all validations
      await this.detectTypos();
      await this.detectMissingFiles();
      await this.detectMissingImports();
      await this.detectUndefinedReferences();
      await this.detectTranslationIssues();
      await this.detectHardcodedStrings();
      await this.detectNamingInconsistencies();
      
      // Display results
      this.displayResults();
      
      // Save report
      this.saveReport();
      
      // Exit with appropriate code
      if (this.issues.length > 0) {
        const critical = this.issues.filter(i => i.severity === 'critical').length;
        if (critical > 0) {
          console.log(`\n${colors.red}❌ ${critical} critical issue(s) found!${colors.reset}`);
          process.exit(1);
        } else {
          console.log(`\n${colors.yellow}⚠️  ${this.issues.length} issue(s) found${colors.reset}`);
          process.exit(0);
        }
      } else {
        console.log(`\n${colors.green}✅ No issues detected${colors.reset}`);
        process.exit(0);
      }
    } catch (error) {
      console.error(`${colors.red}❌ Validation failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  getChangedFiles() {
    try {
      const output = execSync(
        `git diff --name-only ${this.baseRef}...${this.headRef}`,
        { encoding: 'utf-8', cwd: this.workingDir }
      );
      
      this.changedFiles = output.trim().split('\n').filter(f => f);
      console.log(`${colors.cyan}📁 Analyzing ${this.changedFiles.length} changed files${colors.reset}\n`);
    } catch (error) {
      console.error('Error getting changed files:', error.message);
      throw error;
    }
  }

  /**
   * Detect typos in code
   */
  async detectTypos() {
    console.log(`${colors.cyan}📝 Checking for typos...${colors.reset}`);
    
    for (const file of this.changedFiles) {
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check each line for typos
      lines.forEach((line, lineNum) => {
        for (const [typo, correct] of Object.entries(this.typoPatterns)) {
          const regex = new RegExp(`\\b${typo}\\b`, 'gi');
          if (regex.test(line)) {
            this.issues.push({
              type: 'typo',
              severity: 'high',
              file: file,
              line: lineNum + 1,
              typo: typo,
              correct: correct,
              message: `Typo detected: '${typo}' should be '${correct}'`,
              suggestion: `Replace '${typo}' with '${correct}'`,
              context: line.trim()
            });
          }
        }
      });
    }
  }

  /**
   * Detect missing files
   */
  async detectMissingFiles() {
    console.log(`${colors.cyan}📂 Checking for missing files...${colors.reset}`);
    
    for (const file of this.changedFiles) {
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check imports
      const importPatterns = [
        /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      ];
      
      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath.startsWith('.')) continue; // Skip node_modules
          
          const resolvedPath = this.resolveImportPath(file, importPath);
          if (resolvedPath && !this.fileExists(resolvedPath)) {
            this.issues.push({
              type: 'missing-file',
              severity: 'critical',
              file: file,
              reference: importPath,
              resolvedPath: resolvedPath,
              message: `Referenced file '${importPath}' does not exist`,
              suggestion: `Create the file '${resolvedPath}' or fix the import path`
            });
          }
        }
      }
      
      // Check asset references
      const assetPattern = /['"]([./]*assets\/[^'"]+)['"]/g;
      let match;
      while ((match = assetPattern.exec(content)) !== null) {
        const assetPath = match[1];
        const resolvedPath = this.resolveAssetPath(file, assetPath);
        if (resolvedPath && !this.fileExists(resolvedPath)) {
          this.issues.push({
            type: 'missing-asset',
            severity: 'high',
            file: file,
            reference: assetPath,
            resolvedPath: resolvedPath,
            message: `Asset file '${assetPath}' does not exist`,
            suggestion: `Add the asset file '${resolvedPath}' to your PR`
          });
        }
      }
    }
  }

  /**
   * Detect translation issues
   */
  async detectTranslationIssues() {
    console.log(`${colors.cyan}🌐 Checking translation keys...${colors.reset}`);
    
    // Find all i18n files
    const i18nFiles = this.findI18nFiles();
    
    // Check for typos in i18n keys
    for (const i18nFile of i18nFiles) {
      const filePath = path.join(this.workingDir, i18nFile);
      if (!fs.existsSync(filePath)) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const translations = JSON.parse(content);
        
        // Check keys for typos
        this.checkObjectKeysForTypos(translations, i18nFile, []);
      } catch (error) {
        console.error(`Error parsing ${i18nFile}:`, error.message);
      }
    }
    
    // Check translation key usage in code
    for (const file of this.changedFiles) {
      if (!/\.(ts|tsx|jsx|html)$/.test(file)) continue;
      
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Find translation key references
      const translationPatterns = [
        /['"]([A-Z_]+\.[A-Z_]+(?:\.[A-Z_]+)*)['"]\s*\|\s*translate/g,
        /translate\s*\(\s*['"]([A-Z_]+\.[A-Z_]+(?:\.[A-Z_]+)*)['"]/g
      ];
      
      for (const pattern of translationPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const translationKey = match[1];
          const lineNum = content.substring(0, match.index).split('\n').length;
          
          // Check if any i18n file exists for this module
          if (i18nFiles.length === 0) {
            this.issues.push({
              type: 'missing-i18n-file',
              severity: 'critical',
              file: file,
              line: lineNum,
              reference: translationKey,
              message: `Translation key '${translationKey}' used but no i18n files found`,
              suggestion: `Create i18n file (e.g., en.json) with translation keys`,
              context: lines[lineNum - 1]?.trim()
            });
            continue;
          }
          
          // Check if key exists in any i18n file
          let keyFound = false;
          for (const i18nFile of i18nFiles) {
            if (this.translationKeyExists(i18nFile, translationKey)) {
              keyFound = true;
              break;
            }
          }
          
          if (!keyFound) {
            // Determine expected i18n file path based on component location
            const expectedI18nPath = this.getExpectedI18nPath(file);
            
            this.issues.push({
              type: 'missing-translation-key',
              severity: 'critical',
              file: file,
              line: lineNum,
              reference: translationKey,
              expectedI18nFile: expectedI18nPath,
              message: `Translation key '${translationKey}' not found in any i18n file`,
              suggestion: expectedI18nPath
                ? `Add '${translationKey}' to ${expectedI18nPath} or create the file if missing`
                : `Add '${translationKey}' to appropriate i18n files or fix the key name`,
              context: lines[lineNum - 1]?.trim()
            });
          }
        }
      }
    }
  }
  
  /**
   * Get expected i18n file path based on component location
   */
  getExpectedI18nPath(componentFile) {
    // Extract the package/module path
    const match = componentFile.match(/packages\/([^/]+)\//);
    if (match) {
      const packageName = match[1];
      return `call-center-return/packages/${packageName}/src-custom/assets/i18n/en.json`;
    }
    return null;
  }

  /**
   * Detect hardcoded strings that should be translated
   */
  async detectHardcodedStrings() {
    console.log(`${colors.cyan}💬 Checking for hardcoded strings...${colors.reset}`);
    
    for (const file of this.changedFiles) {
      if (!/\.(ts|tsx|jsx|html)$/.test(file)) continue;
      
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for hardcoded user-facing strings
      lines.forEach((line, lineNum) => {
        // Check for placeholder attributes with hardcoded text
        const placeholderMatch = line.match(/placeholder\s*=\s*["']([^"']+)["']/);
        if (placeholderMatch && !line.includes('translate')) {
          const text = placeholderMatch[1];
          // Skip if it's a variable or already a translation key
          if (!text.includes('{{') && !text.match(/^[A-Z_]+\.[A-Z_]+/)) {
            this.issues.push({
              type: 'hardcoded-string',
              severity: 'medium',
              file: file,
              line: lineNum + 1,
              text: text,
              message: `Hardcoded placeholder text: "${text}"`,
              suggestion: `Use translation key with | translate pipe`,
              context: line.trim()
            });
          }
        }
        
        // Check for hardcoded button/label text
        const labelMatch = line.match(/>([A-Z][a-z\s]{10,})</);
        if (labelMatch && !line.includes('translate')) {
          const text = labelMatch[1].trim();
          if (text.length > 10 && !text.includes('{{')) {
            this.issues.push({
              type: 'hardcoded-string',
              severity: 'low',
              file: file,
              line: lineNum + 1,
              text: text,
              message: `Hardcoded text: "${text}"`,
              suggestion: `Consider using translation key`,
              context: line.trim()
            });
          }
        }
      });
    }
  }

  /**
   * Detect missing imports for referenced classes/services
   */
  async detectMissingImports() {
    console.log(`${colors.cyan}📦 Checking for missing imports...${colors.reset}`);
    
    for (const file of this.changedFiles) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue;
      
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Extract all imports
      const importedIdentifiers = new Set();
      const importPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from/g;
      let match;
      
      while ((match = importPattern.exec(content)) !== null) {
        if (match[1]) {
          // Named imports: { A, B, C }
          match[1].split(',').forEach(name => {
            importedIdentifiers.add(name.trim().split(/\s+as\s+/)[0]);
          });
        } else if (match[2]) {
          // Default import
          importedIdentifiers.add(match[2]);
        }
      }
      
      // Check for class/service references in providers, components arrays, etc.
      const referencePatterns = [
        /providers\s*[:=]\s*\[([^\]]+)\]/gs,
        /components\s*[:=]\s*\[([^\]]+)\]/gs,
        /declarations\s*[:=]\s*\[([^\]]+)\]/gs,
        /exports\s*[:=]\s*\[([^\]]+)\]/gs
      ];
      
      for (const pattern of referencePatterns) {
        let arrayMatch;
        while ((arrayMatch = pattern.exec(content)) !== null) {
          const arrayContent = arrayMatch[1];
          // Extract identifiers (class names)
          const identifierPattern = /\b([A-Z][a-zA-Z0-9]*)\b/g;
          let idMatch;
          
          while ((idMatch = identifierPattern.exec(arrayContent)) !== null) {
            const identifier = idMatch[1];
            
            // Skip common keywords
            if (['Array', 'Object', 'String', 'Number', 'Boolean'].includes(identifier)) {
              continue;
            }
            
            // Check if identifier is imported
            if (!importedIdentifiers.has(identifier)) {
              // Find line number
              const lineNum = content.substring(0, arrayMatch.index).split('\n').length;
              
              this.issues.push({
                type: 'missing-import',
                severity: 'critical',
                file: file,
                line: lineNum,
                identifier: identifier,
                message: `Class/Service '${identifier}' is referenced but not imported`,
                suggestion: `Add import statement: import { ${identifier} } from './path/to/${identifier.toLowerCase()}'`,
                context: lines[lineNum - 1]?.trim()
              });
            }
          }
        }
      }
    }
  }

  /**
   * Detect undefined class/service references
   */
  async detectUndefinedReferences() {
    console.log(`${colors.cyan}🔗 Checking for undefined references...${colors.reset}`);
    
    for (const file of this.changedFiles) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for constructor parameter types
      const constructorPattern = /constructor\s*\([^)]*\)/gs;
      let match;
      
      while ((match = constructorPattern.exec(content)) !== null) {
        const constructorParams = match[0];
        const typePattern = /:\s*([A-Z][a-zA-Z0-9]*)/g;
        let typeMatch;
        
        while ((typeMatch = typePattern.exec(constructorParams)) !== null) {
          const typeName = typeMatch[1];
          
          // Check if type is imported
          const importRegex = new RegExp(`import\\s+.*\\b${typeName}\\b.*from`, 'g');
          if (!importRegex.test(content)) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            
            this.issues.push({
              type: 'undefined-type',
              severity: 'critical',
              file: file,
              line: lineNum,
              typeName: typeName,
              message: `Type '${typeName}' is used but not imported`,
              suggestion: `Add import statement for '${typeName}'`,
              context: lines[lineNum - 1]?.trim()
            });
          }
        }
      }
    }
  }

  /**
   * Detect naming inconsistencies
   */
  async detectNamingInconsistencies() {
    console.log(`${colors.cyan}🏷️  Checking naming patterns...${colors.reset}`);
    
    // This is a placeholder for more sophisticated naming checks
    // Could check for:
    // - Inconsistent casing (camelCase vs snake_case)
    // - Inconsistent prefixes/suffixes
    // - Similar names with typos
  }

  /**
   * Check object keys recursively for typos
   */
  checkObjectKeysForTypos(obj, file, keyPath) {
    for (const key in obj) {
      const currentPath = [...keyPath, key];
      
      // Check key for typos
      for (const [typo, correct] of Object.entries(this.typoPatterns)) {
        if (key.includes(typo)) {
          this.issues.push({
            type: 'typo-in-key',
            severity: 'critical',
            file: file,
            key: currentPath.join('.'),
            typo: typo,
            correct: correct,
            message: `Typo in translation key: '${key}' contains '${typo}', should be '${correct}'`,
            suggestion: `Rename key to use '${correct}' instead of '${typo}'`
          });
        }
      }
      
      // Recurse if value is an object
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.checkObjectKeysForTypos(obj[key], file, currentPath);
      }
    }
  }

  /**
   * Helper methods
   */
  resolveImportPath(fromFile, importPath) {
    try {
      const fromDir = path.dirname(path.join(this.workingDir, fromFile));
      let resolved = path.resolve(fromDir, importPath);
      
      const extensions = ['', '.ts', '.js', '.tsx', '.jsx', '.json'];
      for (const ext of extensions) {
        const testPath = resolved + ext;
        if (fs.existsSync(testPath)) {
          return path.relative(this.workingDir, testPath);
        }
      }
      
      return path.relative(this.workingDir, resolved);
    } catch (error) {
      return null;
    }
  }

  resolveAssetPath(fromFile, assetPath) {
    try {
      const fromDir = path.dirname(path.join(this.workingDir, fromFile));
      const resolved = path.resolve(fromDir, assetPath);
      return path.relative(this.workingDir, resolved);
    } catch (error) {
      return null;
    }
  }

  fileExists(filePath) {
    const fullPath = path.join(this.workingDir, filePath);
    return fs.existsSync(fullPath) || this.changedFiles.includes(filePath);
  }

  findI18nFiles() {
    const i18nFiles = [];
    
    const searchDirs = [
      'src/assets/i18n',
      'assets/i18n',
      'src-custom/assets/i18n',
      'call-center-return/packages/return-search/src-custom/assets/i18n'
    ];
    
    searchDirs.forEach(dir => {
      const fullPath = path.join(this.workingDir, dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            i18nFiles.push(path.join(dir, file));
          }
        });
      }
    });
    
    return i18nFiles;
  }

  translationKeyExists(i18nFile, key) {
    try {
      const filePath = path.join(this.workingDir, i18nFile);
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);
      
      const keys = key.split('.');
      let current = translations;
      
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}${colors.cyan}📊 Validation Results${colors.reset}`);
    console.log('='.repeat(80) + '\n');
    
    if (this.issues.length === 0) {
      console.log(`${colors.green}✅ No issues found!${colors.reset}\n`);
      return;
    }
    
    // Group by severity
    const critical = this.issues.filter(i => i.severity === 'critical');
    const high = this.issues.filter(i => i.severity === 'high');
    const medium = this.issues.filter(i => i.severity === 'medium');
    const low = this.issues.filter(i => i.severity === 'low');
    
    if (critical.length > 0) {
      console.log(`${colors.bold}${colors.red}🔴 Critical Issues (${critical.length}):${colors.reset}\n`);
      critical.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.type}`);
        console.log(`   File: ${colors.yellow}${issue.file}${colors.reset}`);
        if (issue.line) console.log(`   Line: ${issue.line}`);
        console.log(`   ${issue.message}`);
        console.log(`   💡 ${issue.suggestion}\n`);
      });
    }
    
    if (high.length > 0) {
      console.log(`${colors.bold}${colors.yellow}🟠 High Priority (${high.length}):${colors.reset}\n`);
      high.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.type} in ${issue.file}`);
        console.log(`   ${issue.message}\n`);
      });
    }
    
    if (medium.length > 0) {
      console.log(`${colors.bold}🟡 Medium Priority (${medium.length}):${colors.reset}\n`);
      medium.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.type} in ${issue.file}`);
      });
      console.log();
    }
    
    if (low.length > 0) {
      console.log(`${colors.bold}🔵 Low Priority (${low.length}):${colors.reset}\n`);
      console.log(`${low.length} minor issues found\n`);
    }
    
    console.log('='.repeat(80));
    console.log(`${colors.bold}Total: ${this.issues.length} issue(s)${colors.reset}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Save report
   */
  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseRef: this.baseRef,
      headRef: this.headRef,
      summary: {
        total: this.issues.length,
        critical: this.issues.filter(i => i.severity === 'critical').length,
        high: this.issues.filter(i => i.severity === 'high').length,
        medium: this.issues.filter(i => i.severity === 'medium').length,
        low: this.issues.filter(i => i.severity === 'low').length
      },
      issues: this.issues
    };
    
    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(this.outputPath, JSON.stringify(report, null, 2));
    console.log(`${colors.green}✓${colors.reset} Report saved to ${this.outputPath}\n`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    const cleanKey = key.replace(/^--/, '');
    options[cleanKey] = value;
  });
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const validator = new ComprehensiveValidator(options);
  
  validator.validate()
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveValidator;

