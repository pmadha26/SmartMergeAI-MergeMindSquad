#!/usr/bin/env node

/**
 * Validation Files Generator
 * 
 * Generates comprehensive validation files for PR review:
 * - breaking-changes.json - Detailed breaking changes analysis
 * - test-requirements.md - Required tests for changes
 * - migration-guide.md - Migration guide for breaking changes
 * - checklist.md - Validation checklist for reviewers
 * - affected-files.json - Files that may be impacted
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class ValidationFilesGenerator {
  constructor(options = {}) {
    this.prNumber = options.prNumber || process.env.PR_NUMBER;
    this.baseRef = options.baseRef || process.env.BASE_REF || 'origin/main';
    this.headRef = options.headRef || process.env.HEAD_REF || 'HEAD';
    this.outputDir = path.join(process.cwd(), '..', '.validation');
    this.validationReport = null;
  }

  /**
   * Main generation entry point
   */
  async generate() {
    console.log(`${colors.bold}${colors.cyan}📋 Validation Files Generator${colors.reset}\n`);
    console.log(`PR Number: ${this.prNumber}`);
    console.log(`Base: ${this.baseRef}`);
    console.log(`Head: ${this.headRef}\n`);

    try {
      // Load validation report if exists
      this.loadValidationReport();

      // Create output directory
      this.createOutputDirectory();

      // Generate all validation files
      await this.generateBreakingChangesFile();
      await this.generateTestRequirementsFile();
      await this.generateMigrationGuideFile();
      await this.generateChecklistFile();
      await this.generateAffectedFilesFile();
      await this.generateReadmeFile();

      console.log(`\n${colors.green}✅ All validation files generated successfully!${colors.reset}`);
      console.log(`${colors.blue}📁 Location: ${this.outputDir}${colors.reset}\n`);

      return { success: true, outputDir: this.outputDir };
    } catch (error) {
      console.error(`${colors.red}❌ Error generating validation files: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Load existing validation report
   */
  loadValidationReport() {
    const reportPath = path.join(process.cwd(), 'validation-report.json');
    if (fs.existsSync(reportPath)) {
      this.validationReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(`${colors.green}✓${colors.reset} Loaded validation report`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} No validation report found, generating basic files`);
    }
  }

  /**
   * Create output directory
   */
  createOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`${colors.green}✓${colors.reset} Created output directory`);
    }
  }

  /**
   * Generate breaking-changes.json
   */
  async generateBreakingChangesFile() {
    console.log(`${colors.cyan}Generating breaking-changes.json...${colors.reset}`);

    const breakingChanges = {
      prNumber: this.prNumber,
      timestamp: new Date().toISOString(),
      summary: {
        total: this.validationReport?.breakingChanges?.length || 0,
        critical: this.validationReport?.breakingChanges?.filter(c => c.severity === 'critical').length || 0,
        high: this.validationReport?.breakingChanges?.filter(c => c.severity === 'high').length || 0,
        medium: this.validationReport?.breakingChanges?.filter(c => c.severity === 'medium').length || 0
      },
      changes: this.validationReport?.breakingChanges || [],
      overrides: this.validationReport?.overrides || [],
      recommendations: this.generateRecommendations()
    };

    const filePath = path.join(this.outputDir, 'breaking-changes.json');
    fs.writeFileSync(filePath, JSON.stringify(breakingChanges, null, 2));
    console.log(`${colors.green}✓${colors.reset} Generated breaking-changes.json`);
  }

  /**
   * Generate test-requirements.md
   */
  async generateTestRequirementsFile() {
    console.log(`${colors.cyan}Generating test-requirements.md...${colors.reset}`);

    const changedFiles = this.getChangedFiles();
    const testRequirements = this.analyzeTestRequirements(changedFiles);

    let content = `# Test Requirements for PR #${this.prNumber}\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `## Summary\n\n`;
    content += `- **Files Changed:** ${changedFiles.length}\n`;
    content += `- **Test Files Changed:** ${testRequirements.existingTests}\n`;
    content += `- **New Tests Required:** ${testRequirements.newTestsRequired}\n\n`;

    content += `## Required Tests\n\n`;
    
    if (this.validationReport?.breakingChanges?.length > 0) {
      content += `### Breaking Changes Tests\n\n`;
      content += `The following breaking changes require test coverage:\n\n`;
      
      this.validationReport.breakingChanges.forEach((change, index) => {
        content += `${index + 1}. **${change.type}** in \`${change.file}\`\n`;
        content += `   - [ ] Add test for backward compatibility\n`;
        content += `   - [ ] Add test for new behavior\n`;
        content += `   - [ ] Add test for error handling\n\n`;
      });
    }

    content += `### Changed Files Tests\n\n`;
    changedFiles.forEach(file => {
      if (!file.path.includes('.test.') && !file.path.includes('.spec.')) {
        const testFile = this.getTestFilePath(file.path);
        content += `- [ ] \`${file.path}\`\n`;
        content += `  - Test file: \`${testFile}\`\n`;
        content += `  - Status: ${fs.existsSync(path.join(process.cwd(), '..', testFile)) ? '✅ Exists' : '❌ Missing'}\n\n`;
      }
    });

    content += `## Test Coverage Guidelines\n\n`;
    content += `- Aim for at least 80% code coverage\n`;
    content += `- All public APIs must have tests\n`;
    content += `- Breaking changes must have migration tests\n`;
    content += `- Edge cases and error conditions must be tested\n\n`;

    content += `## Running Tests\n\n`;
    content += `\`\`\`bash\n`;
    content += `# Run all tests\n`;
    content += `npm test\n\n`;
    content += `# Run tests with coverage\n`;
    content += `npm test -- --coverage\n\n`;
    content += `# Run specific test file\n`;
    content += `npm test -- path/to/test.spec.js\n`;
    content += `\`\`\`\n\n`;

    content += `---\n*Generated by Bob - Validation Files Generator*\n`;

    const filePath = path.join(this.outputDir, 'test-requirements.md');
    fs.writeFileSync(filePath, content);
    console.log(`${colors.green}✓${colors.reset} Generated test-requirements.md`);
  }

  /**
   * Generate migration-guide.md
   */
  async generateMigrationGuideFile() {
    console.log(`${colors.cyan}Generating migration-guide.md...${colors.reset}`);

    let content = `# Migration Guide for PR #${this.prNumber}\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;

    if (!this.validationReport?.breakingChanges?.length) {
      content += `## No Breaking Changes\n\n`;
      content += `This PR does not introduce any breaking changes. No migration is required.\n\n`;
    } else {
      content += `## Overview\n\n`;
      content += `This PR introduces ${this.validationReport.breakingChanges.length} breaking change(s) that require migration.\n\n`;

      content += `## Breaking Changes\n\n`;

      // Group by severity
      const critical = this.validationReport.breakingChanges.filter(c => c.severity === 'critical');
      const high = this.validationReport.breakingChanges.filter(c => c.severity === 'high');
      const medium = this.validationReport.breakingChanges.filter(c => c.severity === 'medium');

      if (critical.length > 0) {
        content += `### 🔴 Critical Changes (Immediate Action Required)\n\n`;
        critical.forEach((change, index) => {
          content += this.formatMigrationStep(change, index + 1);
        });
      }

      if (high.length > 0) {
        content += `### 🟠 High Priority Changes\n\n`;
        high.forEach((change, index) => {
          content += this.formatMigrationStep(change, index + 1);
        });
      }

      if (medium.length > 0) {
        content += `### 🟡 Medium Priority Changes\n\n`;
        medium.forEach((change, index) => {
          content += this.formatMigrationStep(change, index + 1);
        });
      }

      content += `## Migration Steps\n\n`;
      content += `1. **Review all breaking changes** listed above\n`;
      content += `2. **Update your code** according to the migration instructions\n`;
      content += `3. **Run tests** to ensure everything works\n`;
      content += `4. **Update documentation** if needed\n`;
      content += `5. **Deploy** when ready\n\n`;

      content += `## Need Help?\n\n`;
      content += `If you encounter issues during migration:\n`;
      content += `- Review the detailed suggestions for each change\n`;
      content += `- Check the test requirements document\n`;
      content += `- Contact the PR author for clarification\n\n`;
    }

    content += `---\n*Generated by Bob - Validation Files Generator*\n`;

    const filePath = path.join(this.outputDir, 'migration-guide.md');
    fs.writeFileSync(filePath, content);
    console.log(`${colors.green}✓${colors.reset} Generated migration-guide.md`);
  }

  /**
   * Generate checklist.md
   */
  async generateChecklistFile() {
    console.log(`${colors.cyan}Generating checklist.md...${colors.reset}`);

    let content = `# PR Validation Checklist for PR #${this.prNumber}\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;

    content += `## Pre-Review Checklist\n\n`;
    content += `- [ ] All validation files have been reviewed\n`;
    content += `- [ ] Breaking changes document has been read\n`;
    content += `- [ ] Migration guide has been reviewed (if applicable)\n`;
    content += `- [ ] Test requirements have been checked\n\n`;

    content += `## Code Review Checklist\n\n`;
    content += `### General\n`;
    content += `- [ ] Code follows project style guidelines\n`;
    content += `- [ ] No unnecessary code changes\n`;
    content += `- [ ] Comments are clear and helpful\n`;
    content += `- [ ] No debug code or console.log statements\n\n`;

    content += `### Breaking Changes\n`;
    if (this.validationReport?.breakingChanges?.length > 0) {
      content += `- [ ] All ${this.validationReport.breakingChanges.length} breaking change(s) are justified\n`;
      content += `- [ ] Migration guide is complete and accurate\n`;
      content += `- [ ] Backward compatibility considered\n`;
      content += `- [ ] Version bump is appropriate\n\n`;
    } else {
      content += `- [x] No breaking changes detected\n\n`;
    }

    content += `### Testing\n`;
    content += `- [ ] All required tests are present\n`;
    content += `- [ ] Tests cover edge cases\n`;
    content += `- [ ] Tests pass locally\n`;
    content += `- [ ] Test coverage is adequate (>80%)\n\n`;

    content += `### Documentation\n`;
    content += `- [ ] README updated if needed\n`;
    content += `- [ ] API documentation updated\n`;
    content += `- [ ] CHANGELOG updated\n`;
    content += `- [ ] Migration guide is clear\n\n`;

    content += `### Security\n`;
    content += `- [ ] No sensitive data exposed\n`;
    content += `- [ ] No security vulnerabilities introduced\n`;
    content += `- [ ] Dependencies are up to date\n`;
    content += `- [ ] Input validation is present\n\n`;

    content += `### Performance\n`;
    content += `- [ ] No obvious performance issues\n`;
    content += `- [ ] Database queries are optimized\n`;
    content += `- [ ] No memory leaks\n`;
    content += `- [ ] Caching considered where appropriate\n\n`;

    content += `## Post-Review Actions\n\n`;
    content += `- [ ] All review comments addressed\n`;
    content += `- [ ] CI/CD pipeline passes\n`;
    content += `- [ ] Merge conflicts resolved\n`;
    content += `- [ ] Final approval given\n\n`;

    content += `## Approval Criteria\n\n`;
    content += `This PR can be approved when:\n`;
    content += `- ✅ All checklist items are completed\n`;
    content += `- ✅ All tests pass\n`;
    content += `- ✅ No blocking issues remain\n`;
    content += `- ✅ Code quality meets standards\n\n`;

    content += `---\n*Generated by Bob - Validation Files Generator*\n`;

    const filePath = path.join(this.outputDir, 'checklist.md');
    fs.writeFileSync(filePath, content);
    console.log(`${colors.green}✓${colors.reset} Generated checklist.md`);
  }

  /**
   * Generate affected-files.json
   */
  async generateAffectedFilesFile() {
    console.log(`${colors.cyan}Generating affected-files.json...${colors.reset}`);

    const changedFiles = this.getChangedFiles();
    const affectedFiles = {
      prNumber: this.prNumber,
      timestamp: new Date().toISOString(),
      summary: {
        totalChanged: changedFiles.length,
        added: changedFiles.filter(f => f.status === 'A').length,
        modified: changedFiles.filter(f => f.status === 'M').length,
        deleted: changedFiles.filter(f => f.status === 'D').length
      },
      files: changedFiles.map(f => ({
        path: f.path,
        status: f.status,
        type: this.getFileType(f.path),
        requiresTests: this.requiresTests(f.path),
        testFile: this.getTestFilePath(f.path)
      })),
      potentialImpact: this.analyzePotentialImpact(changedFiles)
    };

    const filePath = path.join(this.outputDir, 'affected-files.json');
    fs.writeFileSync(filePath, JSON.stringify(affectedFiles, null, 2));
    console.log(`${colors.green}✓${colors.reset} Generated affected-files.json`);
  }

  /**
   * Generate README.md for validation directory
   */
  async generateReadmeFile() {
    console.log(`${colors.cyan}Generating README.md...${colors.reset}`);

    let content = `# Validation Files for PR #${this.prNumber}\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;

    content += `## Overview\n\n`;
    content += `This directory contains validation files generated by Bob to assist with PR review.\n\n`;

    content += `## Files\n\n`;
    content += `### 📄 breaking-changes.json\n`;
    content += `Detailed JSON report of all breaking changes detected in this PR.\n\n`;

    content += `### 📋 test-requirements.md\n`;
    content += `List of tests that should be added or updated for this PR.\n\n`;

    content += `### 📖 migration-guide.md\n`;
    content += `Step-by-step guide for migrating code affected by breaking changes.\n\n`;

    content += `### ✅ checklist.md\n`;
    content += `Comprehensive checklist for reviewers to ensure thorough review.\n\n`;

    content += `### 📁 affected-files.json\n`;
    content += `JSON report of all files changed and potentially impacted by this PR.\n\n`;

    content += `## How to Use\n\n`;
    content += `1. **Start with checklist.md** - Use this as your review guide\n`;
    content += `2. **Review breaking-changes.json** - Understand what's changing\n`;
    content += `3. **Check test-requirements.md** - Ensure adequate test coverage\n`;
    content += `4. **Read migration-guide.md** - Understand migration impact\n`;
    content += `5. **Review affected-files.json** - See all impacted files\n\n`;

    content += `## Cleanup\n\n`;
    content += `These files are temporary and will be automatically removed when the PR is merged.\n\n`;

    content += `---\n*Generated by Bob - Validation Files Generator*\n`;

    const filePath = path.join(this.outputDir, 'README.md');
    fs.writeFileSync(filePath, content);
    console.log(`${colors.green}✓${colors.reset} Generated README.md`);
  }

  /**
   * Helper: Get changed files
   */
  getChangedFiles() {
    try {
      const output = execSync(
        `git diff --name-status ${this.baseRef}...${this.headRef}`,
        { encoding: 'utf-8', cwd: path.join(process.cwd(), '..') }
      );

      return output.trim().split('\n').filter(l => l).map(line => {
        const [status, ...fileParts] = line.split('\t');
        return {
          status,
          path: fileParts.join('\t')
        };
      });
    } catch (error) {
      console.error('Error getting changed files:', error.message);
      return [];
    }
  }

  /**
   * Helper: Get test file path for a source file
   */
  getTestFilePath(filePath) {
    const ext = path.extname(filePath);
    const base = filePath.replace(ext, '');
    return `${base}.spec${ext}`;
  }

  /**
   * Helper: Check if file requires tests
   */
  requiresTests(filePath) {
    const noTestExtensions = ['.json', '.md', '.yml', '.yaml', '.txt', '.css', '.scss'];
    const ext = path.extname(filePath);
    return !noTestExtensions.includes(ext) && 
           !filePath.includes('.spec.') && 
           !filePath.includes('.test.');
  }

  /**
   * Helper: Get file type
   */
  getFileType(filePath) {
    const ext = path.extname(filePath);
    const typeMap = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React',
      '.tsx': 'React TypeScript',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.yml': 'YAML',
      '.yaml': 'YAML',
      '.css': 'CSS',
      '.scss': 'SCSS'
    };
    return typeMap[ext] || 'Other';
  }

  /**
   * Helper: Analyze test requirements
   */
  analyzeTestRequirements(changedFiles) {
    const testFiles = changedFiles.filter(f => 
      f.path.includes('.spec.') || f.path.includes('.test.')
    );
    
    const sourceFiles = changedFiles.filter(f => 
      this.requiresTests(f.path)
    );

    return {
      existingTests: testFiles.length,
      newTestsRequired: sourceFiles.length - testFiles.length,
      sourceFiles: sourceFiles.length
    };
  }

  /**
   * Helper: Analyze potential impact
   */
  analyzePotentialImpact(changedFiles) {
    const impact = {
      high: [],
      medium: [],
      low: []
    };

    changedFiles.forEach(file => {
      if (file.path.includes('package.json')) {
        impact.high.push({ file: file.path, reason: 'Dependency changes' });
      } else if (file.path.includes('config')) {
        impact.high.push({ file: file.path, reason: 'Configuration changes' });
      } else if (file.path.includes('/api/') || file.path.includes('/service/')) {
        impact.medium.push({ file: file.path, reason: 'API/Service changes' });
      } else if (file.path.includes('.spec.') || file.path.includes('.test.')) {
        impact.low.push({ file: file.path, reason: 'Test file' });
      } else {
        impact.medium.push({ file: file.path, reason: 'Source code change' });
      }
    });

    return impact;
  }

  /**
   * Helper: Generate recommendations
   */
  generateRecommendations() {
    if (!this.validationReport?.breakingChanges?.length) {
      return ['No breaking changes detected - safe to merge after review'];
    }

    const recommendations = [];
    const critical = this.validationReport.breakingChanges.filter(c => c.severity === 'critical').length;
    const high = this.validationReport.breakingChanges.filter(c => c.severity === 'high').length;

    if (critical > 0) {
      recommendations.push('⚠️ Critical breaking changes require immediate attention');
      recommendations.push('Consider creating a major version release');
      recommendations.push('Ensure comprehensive migration guide is provided');
    }

    if (high > 0) {
      recommendations.push('High-priority changes need careful review');
      recommendations.push('Update all affected documentation');
      recommendations.push('Notify all stakeholders before merging');
    }

    recommendations.push('Run full test suite before merging');
    recommendations.push('Consider feature flag for gradual rollout');

    return recommendations;
  }

  /**
   * Helper: Format migration step
   */
  formatMigrationStep(change, index) {
    let content = `#### ${index}. ${change.type}\n\n`;
    content += `**File:** \`${change.file}\`\n\n`;
    content += `**Issue:** ${change.message}\n\n`;
    content += `**Impact:** ${change.impact}\n\n`;
    content += `**Migration:**\n${change.suggestion}\n\n`;
    
    if (change.oldSignature && change.newSignature) {
      content += `**Before:**\n\`\`\`\n${change.oldSignature}\n\`\`\`\n\n`;
      content += `**After:**\n\`\`\`\n${change.newSignature}\n\`\`\`\n\n`;
    }

    return content;
  }
}

// Main execution
if (require.main === module) {
  const generator = new ValidationFilesGenerator();
  
  generator.generate()
    .then(result => {
      console.log('Validation files generated successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to generate validation files:', error);
      process.exit(1);
    });
}

module.exports = ValidationFilesGenerator;

// Made with Bob