#!/usr/bin/env node

/**
 * PR Regression Detector Bot
 * Detects potential regressions by analyzing test coverage and behavior changes
 */

const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Patterns that indicate potential regressions
const REGRESSION_INDICATORS = {
  testRemoval: /^-.*\.(test|spec)\.(js|ts|jsx|tsx)/,
  assertionRemoval: /^-.*expect\(|assert\(|should\./,
  errorHandlingRemoval: /^-.*try\s*{|catch\s*\(|\.catch\(/,
  validationRemoval: /^-.*if\s*\(.*null|undefined|isEmpty|isValid/,
  featureFlagRemoval: /^-.*feature.*flag|enabled|disabled/i
};

function analyzeTestCoverage(diff) {
  const testChanges = {
    testsAdded: 0,
    testsRemoved: 0,
    testsModified: 0,
    assertionsRemoved: 0,
    testFiles: []
  };

  const lines = diff.split('\n');
  let currentFile = '';
  let inTestFile = false;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.*)/);
      if (match) {
        currentFile = match[1];
        inTestFile = /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(currentFile);
        if (inTestFile) {
          testChanges.testFiles.push(currentFile);
        }
      }
      continue;
    }

    if (inTestFile) {
      if (line.startsWith('+') && /it\(|test\(|describe\(/.test(line)) {
        testChanges.testsAdded++;
      }
      if (line.startsWith('-') && /it\(|test\(|describe\(/.test(line)) {
        testChanges.testsRemoved++;
      }
      if (line.startsWith('-') && /expect\(|assert\(|should\./.test(line)) {
        testChanges.assertionsRemoved++;
      }
    }
  }

  return testChanges;
}

function detectRegressionRisks(diff) {
  const risks = [];
  const lines = diff.split('\n');
  let currentFile = '';
  let lineNumber = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.*)/);
      if (match) currentFile = match[1];
      lineNumber = 0;
      continue;
    }

    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)/);
      if (match) lineNumber = parseInt(match[1]);
      continue;
    }

    if (line.startsWith('-') && !line.startsWith('---')) {
      lineNumber++;
      const content = line.substring(1);

      // Check for test removal
      if (REGRESSION_INDICATORS.testRemoval.test(currentFile)) {
        risks.push({
          type: 'test-removal',
          severity: 'high',
          file: currentFile,
          line: lineNumber,
          message: 'Test file or test case removed',
          code: content.trim()
        });
      }

      // Check for assertion removal
      if (REGRESSION_INDICATORS.assertionRemoval.test(line)) {
        risks.push({
          type: 'assertion-removal',
          severity: 'high',
          file: currentFile,
          line: lineNumber,
          message: 'Test assertion removed - may reduce test coverage',
          code: content.trim()
        });
      }

      // Check for error handling removal
      if (REGRESSION_INDICATORS.errorHandlingRemoval.test(line)) {
        risks.push({
          type: 'error-handling-removal',
          severity: 'medium',
          file: currentFile,
          line: lineNumber,
          message: 'Error handling code removed',
          code: content.trim()
        });
      }

      // Check for validation removal
      if (REGRESSION_INDICATORS.validationRemoval.test(line)) {
        risks.push({
          type: 'validation-removal',
          severity: 'medium',
          file: currentFile,
          line: lineNumber,
          message: 'Input validation removed',
          code: content.trim()
        });
      }

      // Check for feature flag removal
      if (REGRESSION_INDICATORS.featureFlagRemoval.test(line)) {
        risks.push({
          type: 'feature-flag-removal',
          severity: 'low',
          file: currentFile,
          line: lineNumber,
          message: 'Feature flag code removed',
          code: content.trim()
        });
      }
    }

    if (line.startsWith('-') || line.startsWith(' ')) lineNumber++;
  }

  return risks;
}

function analyzeAPIChanges(diff) {
  const apiChanges = [];
  const lines = diff.split('\n');
  let currentFile = '';
  let lineNumber = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.*)/);
      if (match) currentFile = match[1];
      lineNumber = 0;
      continue;
    }

    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)/);
      if (match) lineNumber = parseInt(match[1]);
      continue;
    }

    // Check for API signature changes
    if (line.startsWith('-') && !line.startsWith('---')) {
      const content = line.substring(1);
      
      // Function signature changes
      if (/export\s+(function|const|class)/.test(content)) {
        apiChanges.push({
          type: 'api-signature-change',
          severity: 'high',
          file: currentFile,
          line: lineNumber,
          message: 'Public API signature modified',
          oldCode: content.trim()
        });
      }

      // Interface/Type changes
      if (/export\s+(interface|type)/.test(content)) {
        apiChanges.push({
          type: 'type-definition-change',
          severity: 'high',
          file: currentFile,
          line: lineNumber,
          message: 'Type definition modified',
          oldCode: content.trim()
        });
      }
    }

    if (line.startsWith('-') || line.startsWith(' ')) lineNumber++;
  }

  return apiChanges;
}

async function detectRegressions(owner, repo, prNumber) {
  try {
    console.log(`Detecting regressions in PR #${prNumber}...`);

    // Get the diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });

    // Analyze test coverage
    const testCoverage = analyzeTestCoverage(diff);
    
    // Detect regression risks
    const regressionRisks = detectRegressionRisks(diff);
    
    // Analyze API changes
    const apiChanges = analyzeAPIChanges(diff);

    console.log(`Found ${regressionRisks.length} regression risks, ${apiChanges.length} API changes`);

    // Calculate risk score
    const criticalRisks = regressionRisks.filter(r => r.severity === 'high').length;
    const mediumRisks = regressionRisks.filter(r => r.severity === 'medium').length;
    const riskScore = (criticalRisks * 3) + (mediumRisks * 2) + regressionRisks.length;

    // Generate report
    let report = `## 🔍 SmartMergeAI's Regression Analysis\n\n`;
    
    // Risk score
    let riskLevel = 'Low';
    let riskEmoji = '🟢';
    if (riskScore > 10) {
      riskLevel = 'High';
      riskEmoji = '🔴';
    } else if (riskScore > 5) {
      riskLevel = 'Medium';
      riskEmoji = '🟡';
    }

    report += `**Overall Regression Risk:** ${riskEmoji} ${riskLevel} (Score: ${riskScore})\n\n`;

    // Test coverage analysis
    report += `### 📊 Test Coverage Analysis\n\n`;
    report += `- Tests Added: ${testCoverage.testsAdded}\n`;
    report += `- Tests Removed: ${testCoverage.testsRemoved}\n`;
    report += `- Assertions Removed: ${testCoverage.assertionsRemoved}\n`;
    
    if (testCoverage.testsRemoved > 0) {
      report += `\n⚠️ **Warning:** Tests were removed. Ensure coverage is maintained.\n`;
    }
    if (testCoverage.assertionsRemoved > 0) {
      report += `\n⚠️ **Warning:** ${testCoverage.assertionsRemoved} assertion(s) removed.\n`;
    }
    report += `\n`;

    // Regression risks
    if (regressionRisks.length > 0) {
      report += `### 🚨 Potential Regression Risks\n\n`;
      
      const highRisks = regressionRisks.filter(r => r.severity === 'high');
      if (highRisks.length > 0) {
        report += `**High Severity (${highRisks.length}):**\n`;
        for (const risk of highRisks.slice(0, 5)) {
          report += `- \`${risk.file}:${risk.line}\` - ${risk.message}\n`;
        }
        report += `\n`;
      }

      const medRisks = regressionRisks.filter(r => r.severity === 'medium');
      if (medRisks.length > 0) {
        report += `**Medium Severity (${medRisks.length}):**\n`;
        for (const risk of medRisks.slice(0, 5)) {
          report += `- \`${risk.file}:${risk.line}\` - ${risk.message}\n`;
        }
        report += `\n`;
      }
    }

    // API changes
    if (apiChanges.length > 0) {
      report += `### 🔄 API Changes Detected\n\n`;
      report += `⚠️ **${apiChanges.length} API change(s) detected** - These may break existing consumers:\n\n`;
      for (const change of apiChanges.slice(0, 5)) {
        report += `- \`${change.file}:${change.line}\` - ${change.message}\n`;
      }
      report += `\n**Action Required:**\n`;
      report += `- Update API documentation\n`;
      report += `- Consider deprecation strategy\n`;
      report += `- Notify API consumers\n\n`;
    }

    // Recommendations
    report += `### 💡 Recommendations\n\n`;
    if (criticalRisks > 0) {
      report += `- 🔴 **Critical:** Address high-severity regression risks before merging\n`;
    }
    if (testCoverage.testsRemoved > testCoverage.testsAdded) {
      report += `- ⚠️ Add tests to maintain or improve coverage\n`;
    }
    if (apiChanges.length > 0) {
      report += `- 📋 Document API changes and update version\n`;
    }
    if (regressionRisks.length > 5) {
      report += `- 🧪 Run comprehensive regression test suite\n`;
    }

    report += `\n---\n*Automated regression analysis by SmartMergeAI*`;

    // Post the report
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: report
    });

    // Add labels
    const labels = [];
    if (riskLevel === 'High') labels.push('high-regression-risk');
    if (riskLevel === 'Medium') labels.push('medium-regression-risk');
    if (apiChanges.length > 0) labels.push('api-change');
    if (testCoverage.testsRemoved > 0) labels.push('test-coverage-reduced');

    if (labels.length > 0) {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels
      });
    }

    console.log('Regression detection complete');

    return {
      riskScore,
      riskLevel,
      regressionRisks: regressionRisks.length,
      apiChanges: apiChanges.length,
      testCoverage
    };

  } catch (error) {
    console.error('Error detecting regressions:', error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY_NAME;
  const prNumber = parseInt(process.env.PR_NUMBER);

  if (!owner || !repo || !prNumber) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  detectRegressions(owner, repo, prNumber)
    .then(result => {
      console.log('Regression detection result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to detect regressions:', error);
      process.exit(1);
    });
}

module.exports = { detectRegressions };


