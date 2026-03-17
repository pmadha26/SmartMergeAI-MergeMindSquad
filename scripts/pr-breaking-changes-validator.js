#!/usr/bin/env node

/**
 * PR Breaking Changes & Override Validator
 * 
 * Validates PRs for:
 * 1. Breaking changes in APIs, interfaces, and function signatures
 * 2. Functionality overrides that may break existing code
 * 3. Missing imports and broken references
 * 4. Removed dependencies still in use
 * 5. Test coverage changes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
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

class BreakingChangesValidator {
  constructor(options = {}) {
    this.baseRef = options.base || 'origin/main';
    this.headRef = options.head || 'HEAD';
    this.prNumber = options.prNumber;
    this.outputFile = options.output || 'validation-report.json';
    
    this.breakingChanges = [];
    this.overrides = [];
    this.warnings = [];
    this.info = [];
    this.changedFiles = [];
  }

  /**
   * Main validation entry point
   */
  async validate() {
    console.log(`${colors.bold}${colors.cyan}🔍 Breaking Changes & Override Validator${colors.reset}\n`);
    console.log(`Base: ${this.baseRef}`);
    console.log(`Head: ${this.headRef}\n`);

    try {
      // Get changed files
      this.getChangedFiles();

      // Run all validation checks
      await this.checkAPIBreakingChanges();
      await this.checkFunctionSignatureChanges();
      await this.checkInterfaceTypeChanges();
      await this.checkClassMethodOverrides();
      await this.checkConfigurationOverrides();
      await this.checkDependencyChanges();
      await this.checkImportBreakages();
      await this.checkTestCoverageImpact();

      // Generate report
      const report = this.generateReport();
      
      // Save report
      this.saveReport(report);
      
      // Display results
      this.displayResults();

      // Exit with appropriate code
      if (this.breakingChanges.length > 0) {
        console.log(`\n${colors.red}❌ Breaking changes detected!${colors.reset}`);
        process.exit(1);
      } else {
        console.log(`\n${colors.green}✅ No breaking changes detected${colors.reset}`);
        process.exit(0);
      }
    } catch (error) {
      console.error(`${colors.red}❌ Validation failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  /**
   * Get list of changed files between base and head
   */
  getChangedFiles() {
    try {
      const output = execSync(
        `git diff --name-status ${this.baseRef}...${this.headRef}`,
        { encoding: 'utf-8' }
      );

      const lines = output.trim().split('\n').filter(l => l);
      
      lines.forEach(line => {
        const [status, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');
        
        this.changedFiles.push({
          status,
          path: file,
          isDeleted: status === 'D',
          isAdded: status === 'A',
          isModified: status === 'M'
        });
      });

      console.log(`${colors.blue}📁 Changed files: ${this.changedFiles.length}${colors.reset}\n`);
    } catch (error) {
      console.error(`${colors.red}Error getting changed files: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Check for API breaking changes (exported functions, classes, interfaces)
   */
  async checkAPIBreakingChanges() {
    console.log(`${colors.cyan}🔎 Checking for API breaking changes...${colors.reset}`);

    const apiFiles = this.changedFiles.filter(f => 
      !f.isAdded && 
      (f.path.endsWith('.ts') || f.path.endsWith('.js')) &&
      !f.path.includes('.spec.') &&
      !f.path.includes('.test.')
    );

    for (const file of apiFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        // Check for removed exports
        const removedExports = this.findRemovedExports(diff);
        removedExports.forEach(exp => {
          this.breakingChanges.push({
            type: 'removed-export',
            severity: 'critical',
            file: file.path,
            message: `Exported ${exp.type} '${exp.name}' was removed`,
            impact: 'Any code importing this will break',
            suggestion: 'Consider deprecating instead of removing, or provide migration path'
          });
        });

        // Check for modified export signatures
        const modifiedExports = this.findModifiedExportSignatures(diff);
        modifiedExports.forEach(exp => {
          this.breakingChanges.push({
            type: 'modified-export-signature',
            severity: 'high',
            file: file.path,
            message: `Export signature changed: ${exp.name}`,
            oldSignature: exp.oldSignature,
            newSignature: exp.newSignature,
            impact: 'Consumers may need to update their code',
            suggestion: 'Ensure backward compatibility or version bump'
          });
        });

      } catch (error) {
        // File might be binary or inaccessible
      }
    }
  }

  /**
   * Find removed exports in diff
   */
  findRemovedExports(diff) {
    const removed = [];
    const lines = diff.split('\n');

    const exportPatterns = [
      { regex: /^-\s*export\s+(class|interface|type|enum)\s+([A-Z][a-zA-Z0-9]*)/g, type: 'type' },
      { regex: /^-\s*export\s+(function|const|let)\s+([a-zA-Z][a-zA-Z0-9]*)/g, type: 'function' },
      { regex: /^-\s*export\s+default\s+(class|function)\s+([A-Z][a-zA-Z0-9]*)/g, type: 'default' }
    ];

    lines.forEach(line => {
      exportPatterns.forEach(pattern => {
        const regex = new RegExp(pattern.regex.source, 'g');
        let match;
        while ((match = regex.exec(line)) !== null) {
          // Check if it's not just moved (exists in added lines)
          const isReAdded = lines.some(l => 
            l.startsWith('+') && l.includes(`export`) && l.includes(match[2])
          );
          
          if (!isReAdded) {
            removed.push({
              type: pattern.type,
              name: match[2]
            });
          }
        }
      });
    });

    return removed;
  }

  /**
   * Find modified export signatures
   */
  findModifiedExportSignatures(diff) {
    const modified = [];
    const lines = diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for removed export followed by added export with same name
      if (line.startsWith('-') && /export\s+(function|const|class)/.test(line)) {
        const nameMatch = line.match(/export\s+(?:function|const|class)\s+([a-zA-Z][a-zA-Z0-9]*)/);
        if (nameMatch) {
          const name = nameMatch[1];
          
          // Look ahead for the new version
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].startsWith('+') && lines[j].includes(name)) {
              modified.push({
                name,
                oldSignature: line.substring(1).trim(),
                newSignature: lines[j].substring(1).trim()
              });
              break;
            }
          }
        }
      }
    }

    return modified;
  }

  /**
   * Check for function signature changes
   */
  async checkFunctionSignatureChanges() {
    console.log(`${colors.cyan}🔧 Checking function signature changes...${colors.reset}`);

    const codeFiles = this.changedFiles.filter(f => 
      !f.isAdded && 
      (f.path.endsWith('.ts') || f.path.endsWith('.js'))
    );

    for (const file of codeFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        const signatureChanges = this.detectSignatureChanges(diff);
        signatureChanges.forEach(change => {
          const severity = change.isPublic ? 'high' : 'medium';
          
          this.breakingChanges.push({
            type: 'function-signature-change',
            severity,
            file: file.path,
            function: change.name,
            message: `Function signature changed: ${change.name}`,
            oldParams: change.oldParams,
            newParams: change.newParams,
            impact: change.isPublic ? 'Public API change - may break consumers' : 'Internal change',
            suggestion: 'Ensure all callers are updated'
          });
        });

      } catch (error) {
        // Skip files that can't be diffed
      }
    }
  }

  /**
   * Detect function signature changes in diff
   */
  detectSignatureChanges(diff) {
    const changes = [];
    const lines = diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match function declarations
      const funcMatch = line.match(/^[-+]\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z][a-zA-Z0-9]*)\s*\((.*?)\)/);
      if (funcMatch) {
        const isRemoved = line.startsWith('-');
        const name = funcMatch[1];
        const params = funcMatch[2];
        
        // Look for corresponding change
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if ((isRemoved && nextLine.startsWith('+')) || (!isRemoved && nextLine.startsWith('-'))) {
            const nextMatch = nextLine.match(/function\s+([a-zA-Z][a-zA-Z0-9]*)\s*\((.*?)\)/);
            if (nextMatch && nextMatch[1] === name) {
              changes.push({
                name,
                oldParams: isRemoved ? params : nextMatch[2],
                newParams: isRemoved ? nextMatch[2] : params,
                isPublic: line.includes('export')
              });
              break;
            }
          }
        }
      }
    }

    return changes;
  }

  /**
   * Check for interface and type changes
   */
  async checkInterfaceTypeChanges() {
    console.log(`${colors.cyan}📋 Checking interface and type changes...${colors.reset}`);

    const tsFiles = this.changedFiles.filter(f => 
      !f.isAdded && f.path.endsWith('.ts')
    );

    for (const file of tsFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        // Check for removed interface properties
        const removedProps = this.findRemovedInterfaceProperties(diff);
        removedProps.forEach(prop => {
          this.breakingChanges.push({
            type: 'interface-property-removed',
            severity: 'high',
            file: file.path,
            interface: prop.interface,
            property: prop.property,
            message: `Property '${prop.property}' removed from interface '${prop.interface}'`,
            impact: 'Code using this property will break',
            suggestion: 'Make property optional or provide migration'
          });
        });

        // Check for changed property types
        const changedTypes = this.findChangedPropertyTypes(diff);
        changedTypes.forEach(change => {
          this.breakingChanges.push({
            type: 'property-type-changed',
            severity: 'high',
            file: file.path,
            property: change.property,
            message: `Property type changed: ${change.property}`,
            oldType: change.oldType,
            newType: change.newType,
            impact: 'Type mismatch may cause compilation errors',
            suggestion: 'Ensure type compatibility or update consumers'
          });
        });

      } catch (error) {
        // Skip files that can't be diffed
      }
    }
  }

  /**
   * Find removed interface properties
   */
  findRemovedInterfaceProperties(diff) {
    const removed = [];
    const lines = diff.split('\n');
    let currentInterface = null;

    lines.forEach(line => {
      // Track current interface
      const interfaceMatch = line.match(/(?:interface|type)\s+([A-Z][a-zA-Z0-9]*)/);
      if (interfaceMatch) {
        currentInterface = interfaceMatch[1];
      }

      // Find removed properties
      if (line.startsWith('-') && currentInterface) {
        const propMatch = line.match(/^\-\s+([a-zA-Z][a-zA-Z0-9]*)\??:\s*(.+?)[;,]/);
        if (propMatch) {
          // Check if property is re-added
          const isReAdded = lines.some(l => 
            l.startsWith('+') && l.includes(propMatch[1])
          );
          
          if (!isReAdded) {
            removed.push({
              interface: currentInterface,
              property: propMatch[1]
            });
          }
        }
      }
    });

    return removed;
  }

  /**
   * Find changed property types
   */
  findChangedPropertyTypes(diff) {
    const changed = [];
    const lines = diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('-')) {
        const propMatch = line.match(/^\-\s+([a-zA-Z][a-zA-Z0-9]*)\??:\s*(.+?)[;,]/);
        if (propMatch) {
          const propName = propMatch[1];
          const oldType = propMatch[2].trim();
          
          // Look for new version
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].startsWith('+')) {
              const newMatch = lines[j].match(new RegExp(`^\\+\\s+${propName}\\??:\\s*(.+?)[;,]`));
              if (newMatch) {
                const newType = newMatch[1].trim();
                if (oldType !== newType) {
                  changed.push({
                    property: propName,
                    oldType,
                    newType
                  });
                }
                break;
              }
            }
          }
        }
      }
    }

    return changed;
  }

  /**
   * Check for class method overrides
   */
  async checkClassMethodOverrides() {
    console.log(`${colors.cyan}🏗️  Checking class method overrides...${colors.reset}`);

    const tsFiles = this.changedFiles.filter(f => 
      f.path.endsWith('.ts') && !f.path.includes('.spec.')
    );

    for (const file of tsFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        const overrides = this.findMethodOverrides(diff);
        overrides.forEach(override => {
          this.overrides.push({
            type: 'method-override',
            severity: 'medium',
            file: file.path,
            class: override.className,
            method: override.methodName,
            message: `Method '${override.methodName}' overridden in class '${override.className}'`,
            impact: 'Behavior change - verify functionality is preserved',
            suggestion: 'Ensure override maintains expected behavior'
          });
        });

      } catch (error) {
        // Skip files that can't be diffed
      }
    }
  }

  /**
   * Find method overrides in diff
   */
  findMethodOverrides(diff) {
    const overrides = [];
    const lines = diff.split('\n');
    let currentClass = null;

    lines.forEach(line => {
      // Track current class
      const classMatch = line.match(/class\s+([A-Z][a-zA-Z0-9]*)/);
      if (classMatch) {
        currentClass = classMatch[1];
      }

      // Find overridden methods (methods with same name but different implementation)
      if (line.startsWith('+') && currentClass) {
        const methodMatch = line.match(/^\+\s+(?:public|private|protected)?\s*([a-zA-Z][a-zA-Z0-9]*)\s*\(/);
        if (methodMatch) {
          const methodName = methodMatch[1];
          
          // Check if method existed before
          const existedBefore = lines.some(l => 
            l.startsWith('-') && l.includes(methodName) && l.includes('(')
          );
          
          if (existedBefore) {
            overrides.push({
              className: currentClass,
              methodName
            });
          }
        }
      }
    });

    return overrides;
  }

  /**
   * Check for configuration overrides
   */
  async checkConfigurationOverrides() {
    console.log(`${colors.cyan}⚙️  Checking configuration overrides...${colors.reset}`);

    const configFiles = this.changedFiles.filter(f => 
      f.path.includes('config') || 
      f.path.endsWith('.json') || 
      f.path.endsWith('.yml') ||
      f.path.endsWith('.yaml')
    );

    for (const file of configFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        const configChanges = this.findConfigurationChanges(diff);
        configChanges.forEach(change => {
          this.overrides.push({
            type: 'configuration-override',
            severity: 'medium',
            file: file.path,
            key: change.key,
            message: `Configuration '${change.key}' changed`,
            oldValue: change.oldValue,
            newValue: change.newValue,
            impact: 'Application behavior may change',
            suggestion: 'Verify configuration change is intentional'
          });
        });

      } catch (error) {
        // Skip files that can't be diffed
      }
    }
  }

  /**
   * Find configuration changes
   */
  findConfigurationChanges(diff) {
    const changes = [];
    const lines = diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('-')) {
        const keyMatch = line.match(/^\-\s*["']?([a-zA-Z][a-zA-Z0-9_]*)["']?\s*[:=]\s*(.+)/);
        if (keyMatch) {
          const key = keyMatch[1];
          const oldValue = keyMatch[2].trim();
          
          // Look for new value
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].startsWith('+')) {
              const newMatch = lines[j].match(new RegExp(`^\\+\\s*["']?${key}["']?\\s*[:=]\\s*(.+)`));
              if (newMatch) {
                changes.push({
                  key,
                  oldValue,
                  newValue: newMatch[1].trim()
                });
                break;
              }
            }
          }
        }
      }
    }

    return changes;
  }

  /**
   * Check for dependency changes
   */
  async checkDependencyChanges() {
    console.log(`${colors.cyan}📦 Checking dependency changes...${colors.reset}`);

    const packageFiles = this.changedFiles.filter(f => 
      f.path.endsWith('package.json')
    );

    for (const file of packageFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        const depChanges = this.findDependencyChanges(diff);
        
        depChanges.removed.forEach(dep => {
          this.breakingChanges.push({
            type: 'dependency-removed',
            severity: 'high',
            file: file.path,
            dependency: dep,
            message: `Dependency '${dep}' removed`,
            impact: 'Code using this dependency will break',
            suggestion: 'Ensure dependency is not used or provide alternative'
          });
        });

        depChanges.versionChanged.forEach(dep => {
          this.warnings.push({
            type: 'dependency-version-changed',
            file: file.path,
            dependency: dep.name,
            oldVersion: dep.oldVersion,
            newVersion: dep.newVersion,
            message: `Dependency '${dep.name}' version changed: ${dep.oldVersion} → ${dep.newVersion}`
          });
        });

      } catch (error) {
        // Skip files that can't be diffed
      }
    }
  }

  /**
   * Find dependency changes
   */
  findDependencyChanges(diff) {
    const changes = {
      removed: [],
      versionChanged: []
    };
    
    const lines = diff.split('\n');

    lines.forEach(line => {
      if (line.startsWith('-') && !line.startsWith('---')) {
        const depMatch = line.match(/^\-\s*"([^"]+)":\s*"([^"]+)"/);
        if (depMatch && !line.includes('version') && !line.includes('description')) {
          const depName = depMatch[1];
          const oldVersion = depMatch[2];
          
          // Check if it's re-added with different version
          const reAdded = lines.find(l => 
            l.startsWith('+') && l.includes(`"${depName}"`)
          );
          
          if (reAdded) {
            const newMatch = reAdded.match(/"([^"]+)":\s*"([^"]+)"/);
            if (newMatch && newMatch[2] !== oldVersion) {
              changes.versionChanged.push({
                name: depName,
                oldVersion,
                newVersion: newMatch[2]
              });
            }
          } else {
            changes.removed.push(depName);
          }
        }
      }
    });

    return changes;
  }

  /**
   * Check for import breakages
   */
  async checkImportBreakages() {
    console.log(`${colors.cyan}🔗 Checking for import breakages...${colors.reset}`);

    // Check if deleted files are still imported
    const deletedFiles = this.changedFiles.filter(f => f.isDeleted);
    
    for (const file of deletedFiles) {
      try {
        const fileName = path.basename(file.path, path.extname(file.path));
        
        // Search for imports of this file
        const result = execSync(
          `git grep -l "from ['\"].*${fileName}" -- "*.ts" "*.js" "*.tsx" "*.jsx"`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );

        if (result.trim()) {
          const importingFiles = result.trim().split('\n');
          importingFiles.forEach(importingFile => {
            this.breakingChanges.push({
              type: 'broken-import',
              severity: 'critical',
              file: importingFile,
              deletedFile: file.path,
              message: `File '${importingFile}' imports deleted file '${file.path}'`,
              impact: 'Import will fail at runtime',
              suggestion: 'Remove import or restore file'
            });
          });
        }
      } catch (error) {
        // No imports found (which is good)
      }
    }
  }

  /**
   * Check test coverage impact
   */
  async checkTestCoverageImpact() {
    console.log(`${colors.cyan}🧪 Checking test coverage impact...${colors.reset}`);

    const testFiles = this.changedFiles.filter(f => 
      f.path.includes('.spec.') || f.path.includes('.test.')
    );

    let testsAdded = 0;
    let testsRemoved = 0;

    for (const file of testFiles) {
      try {
        const diff = execSync(
          `git diff ${this.baseRef}...${this.headRef} -- "${file.path}"`,
          { encoding: 'utf-8' }
        );

        const lines = diff.split('\n');
        lines.forEach(line => {
          if (line.startsWith('+') && /it\(|test\(|describe\(/.test(line)) {
            testsAdded++;
          }
          if (line.startsWith('-') && /it\(|test\(|describe\(/.test(line)) {
            testsRemoved++;
          }
        });

      } catch (error) {
        // Skip files that can't be diffed
      }
    }

    if (testsRemoved > 0) {
      this.warnings.push({
        type: 'tests-removed',
        message: `${testsRemoved} test(s) removed`,
        impact: 'Test coverage may be reduced',
        suggestion: 'Ensure removed tests are no longer needed'
      });
    }

    this.info.push({
      type: 'test-coverage',
      message: `Tests added: ${testsAdded}, Tests removed: ${testsRemoved}`
    });
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      prNumber: this.prNumber,
      baseRef: this.baseRef,
      headRef: this.headRef,
      summary: this.generateSummary(),
      breakingChanges: this.breakingChanges,
      overrides: this.overrides,
      warnings: this.warnings,
      info: this.info,
      status: this.breakingChanges.length > 0 ? 'failed' : 'passed'
    };

    return report;
  }

  /**
   * Generate summary text
   */
  generateSummary() {
    let summary = '### 📊 Validation Summary\n\n';
    
    const criticalChanges = this.breakingChanges.filter(c => c.severity === 'critical').length;
    const highChanges = this.breakingChanges.filter(c => c.severity === 'high').length;
    const mediumChanges = this.breakingChanges.filter(c => c.severity === 'medium').length;

    summary += `- **Breaking Changes:** ${this.breakingChanges.length}\n`;
    summary += `  - Critical: ${criticalChanges}\n`;
    summary += `  - High: ${highChanges}\n`;
    summary += `  - Medium: ${mediumChanges}\n`;
    summary += `- **Overrides:** ${this.overrides.length}\n`;
    summary += `- **Warnings:** ${this.warnings.length}\n\n`;

    if (this.breakingChanges.length > 0) {
      summary += '### ❌ Breaking Changes Detected\n\n';
      
      this.breakingChanges.slice(0, 10).forEach((change, index) => {
        summary += `${index + 1}. **${change.type}** (${change.severity})\n`;
        summary += `   - File: \`${change.file}\`\n`;
        summary += `   - ${change.message}\n`;
        summary += `   - Impact: ${change.impact}\n`;
        summary += `   - Suggestion: ${change.suggestion}\n\n`;
      });

      if (this.breakingChanges.length > 10) {
        summary += `*... and ${this.breakingChanges.length - 10} more breaking changes*\n\n`;
      }
    }

    if (this.overrides.length > 0) {
      summary += '### ⚠️ Functionality Overrides\n\n';
      
      this.overrides.slice(0, 5).forEach((override, index) => {
        summary += `${index + 1}. **${override.type}**\n`;
        summary += `   - File: \`${override.file}\`\n`;
        summary += `   - ${override.message}\n`;
        summary += `   - Impact: ${override.impact}\n\n`;
      });
    }

    if (this.breakingChanges.length === 0 && this.overrides.length === 0) {
      summary += '### ✅ No Breaking Changes or Critical Overrides Detected\n\n';
      summary += 'This PR appears safe to merge from a breaking changes perspective.\n';
    }

    return summary;
  }

  /**
   * Save report to file
   */
  saveReport(report) {
    try {
      fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
      console.log(`\n${colors.green}✅ Report saved to ${this.outputFile}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error saving report: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Display validation results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}${colors.cyan}📊 Validation Results${colors.reset}`);
    console.log('='.repeat(80) + '\n');

    // Display breaking changes
    if (this.breakingChanges.length > 0) {
      console.log(`${colors.bold}${colors.red}❌ Breaking Changes (${this.breakingChanges.length}):${colors.reset}\n`);
      
      this.breakingChanges.slice(0, 5).forEach((change, index) => {
        console.log(`${index + 1}. ${colors.red}[${change.severity.toUpperCase()}]${colors.reset} ${change.type}`);
        console.log(`   File: ${colors.yellow}${change.file}${colors.reset}`);
        console.log(`   ${change.message}`);
        console.log(`   💡 ${change.suggestion}\n`);
      });

      if (this.breakingChanges.length > 5) {
        console.log(`   ... and ${this.breakingChanges.length - 5} more\n`);
      }
    }

    // Display overrides
    if (this.overrides.length > 0) {
      console.log(`${colors.bold}${colors.yellow}⚠️  Overrides (${this.overrides.length}):${colors.reset}\n`);
      
      this.overrides.slice(0, 3).forEach((override, index) => {
        console.log(`${index + 1}. ${override.type}`);
        console.log(`   File: ${colors.cyan}${override.file}${colors.reset}`);
        console.log(`   ${override.message}\n`);
      });
    }

    // Display warnings
    if (this.warnings.length > 0) {
      console.log(`${colors.bold}${colors.yellow}⚠️  Warnings (${this.warnings.length}):${colors.reset}\n`);
      
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
      });
      console.log();
    }

    // Summary
    console.log('='.repeat(80));
    if (this.breakingChanges.length === 0) {
      console.log(`${colors.bold}${colors.green}✅ No breaking changes detected!${colors.reset}`);
    } else {
      console.log(`${colors.bold}${colors.red}❌ ${this.breakingChanges.length} breaking change(s) detected!${colors.reset}`);
    }
    console.log('='.repeat(80) + '\n');
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
  const validator = new BreakingChangesValidator(options);
  
  validator.validate().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = BreakingChangesValidator;

// Made with Bob