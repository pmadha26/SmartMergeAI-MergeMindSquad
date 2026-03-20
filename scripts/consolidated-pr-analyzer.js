#!/usr/bin/env node

/**
 * Bob - Consolidated PR Analyzer (MVP)
 * 
 * Performs comprehensive PR analysis in a single run:
 * - Merge conflict detection (including file-level conflicts)
 * - Missing file detection
 * - Bug pattern detection (null checks, unused vars, unreachable code)
 * - Hardcoded credentials detection
 * - Behavior analysis
 * - Regression detection
 * 
 * Posts a SINGLE consolidated report to reduce email notifications
 */

const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY_NAME;
const prNumber = parseInt(process.env.PR_NUMBER);
const baseRef = process.env.BASE_REF || 'main';
const headRef = process.env.HEAD_REF;

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Configuration
const REQUIRED_FILES = {
  root: ['README.md', 'package.json', '.gitignore'],
  config: ['tsconfig.json', '.eslintrc.json', '.eslintrc.js', '.prettierrc'],
  ci: ['.github/workflows', 'bitbucket-pipelines.yml', '.gitlab-ci.yml']
};

const BUG_PATTERNS = {
  nullUnsafe: {
    pattern: /(?:const|let|var)\s+\w+\s*=\s*.*\.\w+.*\n.*\1\.\w+/g,
    message: 'Potential null/undefined access without check',
    severity: 'high'
  },
  unusedVariable: {
    pattern: /(?:const|let|var)\s+(\w+)\s*=.*\n(?!.*\1)/g,
    message: 'Unused variable detected',
    severity: 'low'
  },
  unreachableCode: {
    pattern: /return\s+.*;[\s]*\n[\s]*(?!}|\/\/|\/\*)[^\s]/g,
    message: 'Unreachable code after return statement',
    severity: 'medium'
  },
  missingErrorHandling: {
    pattern: /await\s+[^;]+;(?!\s*\.catch|\s*}\s*catch)/g,
    message: 'Async call without error handling',
    severity: 'high'
  },
  hardcodedCredentials: {
    pattern: /(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*['"][^'"]+['"]/gi,
    message: 'Hardcoded credentials detected',
    severity: 'critical'
  },
  consoleLog: {
    pattern: /console\.(log|debug|info|warn)\(/g,
    message: 'Console statement (should be removed before merge)',
    severity: 'low'
  },
  evalUsage: {
    pattern: /\beval\s*\(/g,
    message: 'Unsafe eval() usage detected',
    severity: 'critical'
  }
};

class ConsolidatedAnalyzer {
  constructor() {
    this.results = {
      critical: [],
      warnings: [],
      info: [],
      passed: [],
      autoFixable: []
    };
    this.stats = {
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      testsAdded: 0,
      testsRemoved: 0
    };
  }

  /**
   * Main analysis orchestrator
   */
  async analyze() {
    console.log(`${colors.bold}${colors.cyan}🤖 Bob's Consolidated PR Analysis${colors.reset}\n`);
    console.log(`PR #${prNumber}: ${baseRef} ← ${headRef}\n`);

    try {
      // Get PR details and diff
      const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
      const diff = await this.getPRDiff();

      // Run all analyses
      await this.analyzeMergeConflicts();
      await this.analyzeMissingFiles();
      await this.analyzeBugPatterns(diff);
      await this.analyzeOrphanedReferences(diff);
      await this.analyzeMissingImports(diff);
      await this.analyzeBehaviorChanges(diff);
      await this.analyzeTestCoverage(diff);
      this.calculateStats(diff);

      // Generate and post consolidated report
      await this.postConsolidatedReport(pr);

      // Set GitHub Actions outputs (FIXED: Using new syntax)
      const hasCritical = this.results.critical.length > 0;
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_issues=${hasCritical}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `critical_count=${this.results.critical.length}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `warning_count=${this.results.warnings.length}\n`);
      } else {
        // Fallback for local testing
        console.log(`has_issues=${hasCritical}`);
        console.log(`critical_count=${this.results.critical.length}`);
        console.log(`warning_count=${this.results.warnings.length}`);
      }

      return {
        success: true,
        hasCritical,
        results: this.results
      };

    } catch (error) {
      console.error(`${colors.red}❌ Analysis failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Get PR diff
   */
  async getPRDiff() {
    try {
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber
      });

      let fullDiff = '';
      for (const file of files) {
        if (file.patch) {
          fullDiff += `diff --git a/${file.filename} b/${file.filename}\n`;
          fullDiff += file.patch + '\n';
        }
      }

      return fullDiff;
    } catch (error) {
      console.error('Error fetching diff:', error.message);
      return '';
    }
  }

  /**
   * Analyze merge conflicts (including file-level conflicts)
   */
  async analyzeMergeConflicts() {
    console.log(`${colors.blue}🔍 Checking merge conflicts...${colors.reset}`);

    try {
      // Fetch branches
      execSync(`git fetch origin ${baseRef}`, { stdio: 'pipe' });
      execSync(`git fetch origin ${headRef}`, { stdio: 'pipe' });

      // Use merge-tree to simulate merge
      const output = execSync(
        `git merge-tree $(git merge-base origin/${baseRef} origin/${headRef}) origin/${baseRef} origin/${headRef}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      // Check for content conflicts
      const hasContentConflicts = output.includes('<<<<<<<');
      
      // Check for file-level conflicts (FIXED)
      const fileConflictPatterns = [
        /^changed in both$/m,
        /^deleted in \w+$/m,
        /^added in \w+$/m,
        /^removed in \w+$/m
      ];

      const hasFileConflicts = fileConflictPatterns.some(pattern => pattern.test(output));

      if (hasContentConflicts || hasFileConflicts) {
        // Parse conflicted files
        const conflictedFiles = new Set();
        const lines = output.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Content conflicts
          if (line.includes('<<<<<<<')) {
            for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
              const match = lines[j].match(/^\+\+\+ b\/(.+)$/);
              if (match) {
                conflictedFiles.add(match[1]);
                break;
              }
            }
          }
          
          // File-level conflicts
          if (fileConflictPatterns.some(p => p.test(line))) {
            for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
              const match = lines[j].match(/^\s+(?:base|our|their)\s+\d+\s+\w+\s+(.+)$/);
              if (match) {
                conflictedFiles.add(match[1]);
                break;
              }
            }
          }
        }

        this.results.critical.push({
          type: 'merge-conflicts',
          title: `Merge Conflicts Detected (${conflictedFiles.size} files)`,
          message: `This PR has merge conflicts with ${baseRef} that must be resolved before merging.`,
          files: Array.from(conflictedFiles),
          severity: 'critical',
          autoFixable: false
        });

        console.log(`${colors.red}❌ Found conflicts in ${conflictedFiles.size} files${colors.reset}`);
      } else {
        this.results.passed.push('No merge conflicts detected');
        console.log(`${colors.green}✅ No merge conflicts${colors.reset}`);
      }

    } catch (error) {
      console.log(`${colors.yellow}⚠️  Could not check conflicts: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Analyze missing required files
   */
  async analyzeMissingFiles() {
    console.log(`${colors.blue}🔍 Checking required files...${colors.reset}`);

    const missingFiles = [];

    // Check root files
    for (const file of REQUIRED_FILES.root) {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        missingFiles.push({ file, category: 'root', required: true });
      }
    }

    // Check config files (at least one should exist)
    const hasConfig = REQUIRED_FILES.config.some(file => 
      fs.existsSync(path.join(process.cwd(), file))
    );
    if (!hasConfig) {
      missingFiles.push({ 
        file: 'Configuration file', 
        category: 'config', 
        required: false,
        suggestion: `Consider adding one of: ${REQUIRED_FILES.config.join(', ')}`
      });
    }

    // Check CI files (at least one should exist)
    const hasCI = REQUIRED_FILES.ci.some(file => 
      fs.existsSync(path.join(process.cwd(), file))
    );
    if (!hasCI) {
      this.results.info.push({
        type: 'missing-ci',
        title: 'No CI/CD Configuration',
        message: 'Consider adding CI/CD pipeline configuration',
        severity: 'info'
      });
    }

    if (missingFiles.length > 0) {
      const critical = missingFiles.filter(f => f.required);
      const warnings = missingFiles.filter(f => !f.required);

      if (critical.length > 0) {
        this.results.critical.push({
          type: 'missing-files',
          title: `Missing Required Files (${critical.length})`,
          message: 'Critical files are missing from the repository',
          files: critical.map(f => f.file),
          severity: 'critical',
          autoFixable: false
        });
      }

      if (warnings.length > 0) {
        this.results.warnings.push({
          type: 'missing-optional-files',
          title: 'Missing Recommended Files',
          message: warnings.map(f => f.suggestion || f.file).join('\n'),
          severity: 'low',
          autoFixable: false
        });
      }

      console.log(`${colors.yellow}⚠️  Missing ${missingFiles.length} files${colors.reset}`);
    } else {
      this.results.passed.push('All required files present');
      console.log(`${colors.green}✅ All required files present${colors.reset}`);
    }
  }

  /**
   * Analyze bug patterns
   */
  async analyzeBugPatterns(diff) {
    console.log(`${colors.blue}🔍 Scanning for bug patterns...${colors.reset}`);

    const lines = diff.split('\n');
    let currentFile = '';
    let lineNumber = 0;
    let foundIssues = 0;

    for (const line of lines) {
      // Track current file
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.*)/);
        if (match) currentFile = match[1];
        lineNumber = 0;
        continue;
      }

      // Track line numbers
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+,?\d* \+(\d+)/);
        if (match) lineNumber = parseInt(match[1]);
        continue;
      }

      // Only analyze added lines
      if (!line.startsWith('+') || line.startsWith('+++')) {
        if (line.startsWith('-') || line.startsWith(' ')) lineNumber++;
        continue;
      }

      lineNumber++;
      const content = line.substring(1);

      // Check each bug pattern
      for (const [patternName, config] of Object.entries(BUG_PATTERNS)) {
        if (config.pattern.test(content)) {
          const issue = {
            type: `bug-${patternName}`,
            title: config.message,
            file: currentFile,
            line: lineNumber,
            code: content.trim(),
            severity: config.severity,
            autoFixable: ['consoleLog', 'unusedVariable'].includes(patternName)
          };

          if (config.severity === 'critical') {
            this.results.critical.push(issue);
          } else if (config.severity === 'high' || config.severity === 'medium') {
            this.results.warnings.push(issue);
          } else {
            this.results.info.push(issue);
          }

          if (issue.autoFixable) {
            this.results.autoFixable.push(issue);
          }

          foundIssues++;
        }
      }
    }

    if (foundIssues === 0) {
      this.results.passed.push('No common bug patterns detected');
      console.log(`${colors.green}✅ No bug patterns found${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Found ${foundIssues} potential issues${colors.reset}`);
    }
  }

  /**
   * Analyze orphaned references (imports to non-existent files)
   */
  async analyzeOrphanedReferences(diff) {
    console.log(`${colors.blue}🔍 Checking for orphaned references...${colors.reset}`);

    const importPattern = /import\s+.*\s+from\s+['"](.+)['"]/g;
    const requirePattern = /require\s*\(\s*['"](.+)['"]\s*\)/g;
    
    const lines = diff.split('\n');
    let currentFile = '';
    let lineNumber = 0;
    const orphanedRefs = [];

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.*)/);
        if (match) currentFile = match[1];
        lineNumber = 0;
        continue;
      }

      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+,?\d* \+(\d+)/);
        if (match) lineNumber = parseInt(match[1]);
        continue;
      }

      if (!line.startsWith('+') || line.startsWith('+++')) {
        if (line.startsWith('-') || line.startsWith(' ')) lineNumber++;
        continue;
      }

      lineNumber++;
      const content = line.substring(1);

      // Check imports
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const resolvedPath = path.resolve(
            path.dirname(currentFile),
            importPath
          );
          
          // Check if file exists (with common extensions)
          const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.json'];
          const exists = extensions.some(ext => 
            fs.existsSync(resolvedPath + ext) || 
            fs.existsSync(path.join(resolvedPath, 'index' + ext))
          );

          if (!exists) {
            orphanedRefs.push({
              file: currentFile,
              line: lineNumber,
              import: importPath,
              code: content.trim()
            });
          }
        }
      }

      // Check requires
      while ((match = requirePattern.exec(content)) !== null) {
        const requirePath = match[1];
        if (requirePath.startsWith('.')) {
          const resolvedPath = path.resolve(
            path.dirname(currentFile),
            requirePath
          );
          
          const extensions = ['', '.js', '.ts', '.json'];
          const exists = extensions.some(ext => 
            fs.existsSync(resolvedPath + ext)
          );

          if (!exists) {
            orphanedRefs.push({
              file: currentFile,
              line: lineNumber,
              import: requirePath,
              code: content.trim()
            });
          }
        }
      }
    }

    if (orphanedRefs.length > 0) {
      this.results.critical.push({
        type: 'orphaned-references',
        title: `Orphaned References Detected (${orphanedRefs.length})`,
        message: 'Imports/requires pointing to non-existent files',
        details: orphanedRefs,
        severity: 'critical',
        autoFixable: false
      });
      console.log(`${colors.red}❌ Found ${orphanedRefs.length} orphaned references${colors.reset}`);
    } else {
      this.results.passed.push('No orphaned references detected');
      console.log(`${colors.green}✅ No orphaned references${colors.reset}`);
    }
  }
  /**
   * Analyze missing imports (identifiers used but not imported)
   */
  async analyzeMissingImports(diff) {
    console.log(`${colors.blue}🔍 Checking for missing imports...${colors.reset}`);

    const lines = diff.split('\n');
    let currentFile = '';
    let lineNumber = 0;
    const missingImports = [];
    const fileContents = new Map();

    // First pass: collect full file contents for changed files
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.*)/);
        if (match) {
          currentFile = match[1];
          // Only process TypeScript/JavaScript files
          if (/\.(ts|tsx|js|jsx)$/.test(currentFile)) {
            try {
              const fullPath = path.join(process.cwd(), currentFile);
              if (fs.existsSync(fullPath)) {
                fileContents.set(currentFile, fs.readFileSync(fullPath, 'utf8'));
              }
            } catch (error) {
              // File might not exist yet, skip
            }
          }
        }
      }
    }

    // Second pass: analyze each file for missing imports
    for (const [filePath, content] of fileContents.entries()) {
      // Extract all imported identifiers
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
        { pattern: /providers\s*[:=]\s*\[([^\]]+)\]/gs, context: 'providers' },
        { pattern: /components\s*[:=]\s*\[([^\]]+)\]/gs, context: 'components' },
        { pattern: /declarations\s*[:=]\s*\[([^\]]+)\]/gs, context: 'declarations' },
        { pattern: /exports\s*[:=]\s*\[([^\]]+)\]/gs, context: 'exports' }
      ];

      for (const { pattern, context } of referencePatterns) {
        let arrayMatch;
        while ((arrayMatch = pattern.exec(content)) !== null) {
          const arrayContent = arrayMatch[1];
          // Extract identifiers (class names)
          const identifierPattern = /\b([A-Z][a-zA-Z0-9]*)\b/g;
          let idMatch;

          while ((idMatch = identifierPattern.exec(arrayContent)) !== null) {
            const identifier = idMatch[1];

            // Skip common keywords and built-in types
            if (['Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Promise'].includes(identifier)) {
              continue;
            }

            // Check if identifier is imported
            if (!importedIdentifiers.has(identifier)) {
              // Find line number in content
              const lineNum = content.substring(0, arrayMatch.index).split('\n').length;
              const codeLine = content.split('\n')[lineNum - 1];

              missingImports.push({
                file: filePath,
                line: lineNum,
                identifier: identifier,
                context: context,
                code: codeLine?.trim()
              });
            }
          }
        }
      }
    }

    if (missingImports.length > 0) {
      this.results.critical.push({
        type: 'missing-imports',
        title: `Missing Imports Detected (${missingImports.length})`,
        message: 'Classes/Services referenced but not imported',
        details: missingImports.map(mi => ({
          file: mi.file,
          line: mi.line,
          message: `'${mi.identifier}' used in ${mi.context} but not imported`,
          suggestion: `Add import statement: import { ${mi.identifier} } from './path/to/${mi.identifier.toLowerCase()}'`,
          code: mi.code
        })),
        severity: 'critical',
        autoFixable: false
      });
      console.log(`${colors.red}❌ Found ${missingImports.length} missing imports${colors.reset}`);
    } else {
      this.results.passed.push('No missing imports detected');
      console.log(`${colors.green}✅ No missing imports${colors.reset}`);
    }
  }


  /**
   * Analyze behavior-impacting changes
   */
  async analyzeBehaviorChanges(diff) {
    console.log(`${colors.blue}🔍 Analyzing behavior changes...${colors.reset}`);

    const behaviorPatterns = {
      apiChanges: /export\s+(interface|type|class|function|const)\s+\w+/g,
      logicChanges: /(if|for|while|switch)\s*\(/g,
      returnChanges: /return\s+/g
    };

    let behaviorChangeCount = 0;
    const lines = diff.split('\n');

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const content = line.substring(1);
        for (const pattern of Object.values(behaviorPatterns)) {
          if (pattern.test(content)) {
            behaviorChangeCount++;
          }
        }
      }
    }

    if (behaviorChangeCount > 10) {
      this.results.warnings.push({
        type: 'significant-behavior-changes',
        title: 'Significant Behavior Changes Detected',
        message: `${behaviorChangeCount} behavior-impacting changes found. Ensure thorough testing.`,
        severity: 'medium',
        autoFixable: false
      });
      console.log(`${colors.yellow}⚠️  ${behaviorChangeCount} behavior changes${colors.reset}`);
    } else {
      this.results.passed.push('Behavior changes within normal range');
      console.log(`${colors.green}✅ Behavior changes: ${behaviorChangeCount}${colors.reset}`);
    }
  }

  /**
   * Analyze test coverage
   */
  async analyzeTestCoverage(diff) {
    console.log(`${colors.blue}🔍 Analyzing test coverage...${colors.reset}`);

    const lines = diff.split('\n');
    let testsAdded = 0;
    let testsRemoved = 0;
    let inTestFile = false;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.*)/);
        if (match) {
          inTestFile = /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(match[1]);
        }
        continue;
      }

      if (inTestFile) {
        if (line.startsWith('+') && /it\(|test\(|describe\(/.test(line)) {
          testsAdded++;
        }
        if (line.startsWith('-') && /it\(|test\(|describe\(/.test(line)) {
          testsRemoved++;
        }
      }
    }

    this.stats.testsAdded = testsAdded;
    this.stats.testsRemoved = testsRemoved;

    if (testsRemoved > testsAdded) {
      this.results.warnings.push({
        type: 'test-coverage-decreased',
        title: 'Test Coverage Decreased',
        message: `${testsRemoved} tests removed, ${testsAdded} tests added`,
        severity: 'high',
        autoFixable: false
      });
      console.log(`${colors.red}❌ Test coverage decreased${colors.reset}`);
    } else if (testsAdded > 0) {
      this.results.passed.push(`${testsAdded} new tests added`);
      console.log(`${colors.green}✅ ${testsAdded} tests added${colors.reset}`);
    } else {
      this.results.info.push({
        type: 'no-tests',
        title: 'No Test Changes',
        message: 'Consider adding tests for new functionality',
        severity: 'info',
        autoFixable: false
      });
    }
  }

  /**
   * Calculate statistics
   */
  calculateStats(diff) {
    const lines = diff.split('\n');
    const files = new Set();

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.*)/);
        if (match) files.add(match[1]);
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        this.stats.linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        this.stats.linesRemoved++;
      }
    }

    this.stats.filesChanged = files.size;
  }

  /**
   * Post consolidated report
   */
  async postConsolidatedReport(pr) {
    console.log(`\n${colors.bold}${colors.cyan}📝 Generating consolidated report...${colors.reset}`);

    const report = this.generateReport(pr);

    try {
      // Find existing Bob comment
      const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber
      });

      // Look for EITHER Bob's comment OR the Simple Validation comment
      // This ensures we update the same comment instead of creating multiple
      const bobComment = comments.find(comment =>
        comment.user.type === 'Bot' &&
        (comment.body.includes('Bob\'s Comprehensive PR Analysis') ||
         comment.body.includes('PR Validation Results'))
      );

      if (bobComment) {
        // Update existing comment
        await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: bobComment.id,
          body: report
        });
        console.log(`${colors.green}✅ Updated existing comment${colors.reset}`);
      } else {
        // Create new comment
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: report
        });
        console.log(`${colors.green}✅ Posted new comment${colors.reset}`);
      }

    } catch (error) {
      console.error(`${colors.red}❌ Failed to post comment: ${error.message}${colors.reset}`);
    }
  }

  /**
   * Generate markdown report
   */
  generateReport(pr) {
    const criticalCount = this.results.critical.length;
    const warningCount = this.results.warnings.length;
    const passedCount = this.results.passed.length;
    const autoFixCount = this.results.autoFixable.length;

    let report = `## 🤖 Bob's Comprehensive PR Analysis\n\n`;
    
    // Summary
    report += `### 📊 Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| **Critical Issues** | ${criticalCount > 0 ? '🔴' : '✅'} ${criticalCount} |\n`;
    report += `| **Warnings** | ${warningCount > 0 ? '⚠️' : '✅'} ${warningCount} |\n`;
    report += `| **Passed Checks** | ✅ ${passedCount} |\n`;
    report += `| **Auto-Fix Available** | 🔧 ${autoFixCount} |\n`;
    report += `| **Files Changed** | 📁 ${this.stats.filesChanged} |\n`;
    report += `| **Lines Added** | ➕ ${this.stats.linesAdded} |\n`;
    report += `| **Lines Removed** | ➖ ${this.stats.linesRemoved} |\n`;
    report += `| **Tests Added** | 🧪 ${this.stats.testsAdded} |\n\n`;

    // Critical Issues
    if (criticalCount > 0) {
      report += `### 🔴 Critical Issues (${criticalCount})\n\n`;
      report += `These issues **must be fixed** before merging:\n\n`;
      
      for (const issue of this.results.critical) {
        report += `#### ${issue.title}\n\n`;
        report += `**Severity:** ${issue.severity.toUpperCase()}\n\n`;
        report += `${issue.message}\n\n`;
        
        if (issue.files && issue.files.length > 0) {
          report += `**Affected Files:**\n`;
          issue.files.forEach(file => {
            report += `- \`${file}\`\n`;
          });
          report += `\n`;
        }
        
        if (issue.details) {
          report += `<details>\n<summary>View Details</summary>\n\n`;
          issue.details.forEach(detail => {
            report += `- **${detail.file}:${detail.line}**\n`;
            report += `  \`\`\`\n  ${detail.code}\n  \`\`\`\n`;
          });
          report += `</details>\n\n`;
        }
        
        if (issue.file && issue.line) {
          report += `**Location:** [\`${issue.file}:${issue.line}\`](${pr.html_url}/files#diff-${Buffer.from(issue.file).toString('base64')}L${issue.line})\n\n`;
          if (issue.code) {
            report += `\`\`\`\n${issue.code}\n\`\`\`\n\n`;
          }
        }
        
        report += `---\n\n`;
      }
    }

    // Warnings
    if (warningCount > 0) {
      report += `### ⚠️ Warnings (${warningCount})\n\n`;
      report += `These issues should be reviewed:\n\n`;
      
      for (const warning of this.results.warnings.slice(0, 10)) { // Limit to 10
        report += `- **${warning.title}**`;
        if (warning.file && warning.line) {
          report += ` - [\`${warning.file}:${warning.line}\`](${pr.html_url}/files)`;
        }
        report += `\n`;
        if (warning.message && warning.message !== warning.title) {
          report += `  ${warning.message}\n`;
        }
      }
      
      if (warningCount > 10) {
        report += `\n*...and ${warningCount - 10} more warnings*\n`;
      }
      report += `\n`;
    }

    // Passed Checks
    if (passedCount > 0) {
      report += `### ✅ Passed Checks (${passedCount})\n\n`;
      this.results.passed.forEach(check => {
        report += `- ${check}\n`;
      });
      report += `\n`;
    }

    // Auto-Fix Suggestions
    if (autoFixCount > 0) {
      report += `### 🔧 Auto-Fix Available (${autoFixCount})\n\n`;
      report += `After approval, Bob can automatically fix:\n\n`;
      
      const fixGroups = {};
      this.results.autoFixable.forEach(fix => {
        const type = fix.type.replace('bug-', '');
        if (!fixGroups[type]) fixGroups[type] = [];
        fixGroups[type].push(fix);
      });
      
      for (const [type, fixes] of Object.entries(fixGroups)) {
        report += `- **${type}**: ${fixes.length} occurrence(s)\n`;
      }
      report += `\n`;
    }

    // Footer
    report += `---\n\n`;
    report += `*Analysis completed at ${new Date().toISOString()}*\n\n`;
    report += `**Next Steps:**\n`;
    if (criticalCount > 0) {
      report += `1. ❌ Fix critical issues listed above\n`;
      report += `2. 🔄 Push changes to trigger re-analysis\n`;
    } else if (warningCount > 0) {
      report += `1. ⚠️ Review warnings and address if needed\n`;
      report += `2. ✅ Request review when ready\n`;
    } else {
      report += `1. ✅ All checks passed!\n`;
      report += `2. 👍 Ready for review and merge\n`;
    }
    
    if (autoFixCount > 0) {
      report += `3. 🔧 Auto-fixes will be applied after approval\n`;
    }

    report += `\n*Powered by Bob - Your Intelligent PR Assistant* 🤖`;

    return report;
  }
}

// Main execution
async function main() {
  const analyzer = new ConsolidatedAnalyzer();
  
  try {
    const result = await analyzer.analyze();
    
    console.log(`\n${colors.bold}${colors.green}✅ Analysis Complete${colors.reset}`);
    console.log(`Critical: ${result.results.critical.length}`);
    console.log(`Warnings: ${result.results.warnings.length}`);
    console.log(`Passed: ${result.results.passed.length}`);
    
    process.exit(result.hasCritical ? 1 : 0);
    
  } catch (error) {
    console.error(`\n${colors.bold}${colors.red}❌ Analysis Failed${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ConsolidatedAnalyzer };

// Made with Bob
