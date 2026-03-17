#!/usr/bin/env node

/**
 * PR Behavior Analyzer Bot
 * Analyzes code changes for behavior-impacting modifications, regressions, and API breaks
 */

const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Patterns that indicate behavior changes
const BEHAVIOR_PATTERNS = {
  apiBreaking: [
    /export\s+(interface|type|class|function|const)\s+\w+/g,  // API exports
    /public\s+(class|interface|function)/g,                    // Public APIs
    /@deprecated/g,                                             // Deprecations
    /breaking\s+change/gi                                       // Explicit breaking changes
  ],
  logicChanges: [
    /if\s*\(/g,                                                 // Conditional logic
    /for\s*\(/g,                                                // Loop logic
    /while\s*\(/g,                                              // Loop logic
    /switch\s*\(/g,                                             // Switch statements
    /return\s+/g,                                               // Return statements
    /throw\s+/g                                                 // Error throwing
  ],
  dataFlow: [
    /\.map\(/g,                                                 // Array transformations
    /\.filter\(/g,                                              // Array filtering
    /\.reduce\(/g,                                              // Array reduction
    /\.sort\(/g,                                                // Sorting
    /JSON\.(parse|stringify)/g                                  // JSON operations
  ],
  security: [
    /eval\(/g,                                                  // Eval usage
    /innerHTML/g,                                               // DOM manipulation
    /dangerouslySetInnerHTML/g,                                 // React unsafe
    /exec\(/g,                                                  // Command execution
    /password|secret|token|key/gi                               // Sensitive data
  ]
};

function analyzeDiff(diff) {
  const issues = [];
  const warnings = [];
  const info = [];

  const lines = diff.split('\n');
  let currentFile = '';
  let lineNumber = 0;

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

    // Only analyze added or modified lines
    if (!line.startsWith('+') || line.startsWith('+++')) {
      if (line.startsWith('-') || line.startsWith(' ')) lineNumber++;
      continue;
    }

    lineNumber++;
    const content = line.substring(1);

    // Check for API breaking changes
    for (const pattern of BEHAVIOR_PATTERNS.apiBreaking) {
      if (pattern.test(content)) {
        issues.push({
          type: 'api-breaking',
          severity: 'high',
          file: currentFile,
          line: lineNumber,
          message: 'Potential API breaking change detected',
          code: content.trim()
        });
      }
    }

    // Check for logic changes
    let logicChangeCount = 0;
    for (const pattern of BEHAVIOR_PATTERNS.logicChanges) {
      const matches = content.match(pattern);
      if (matches) logicChangeCount += matches.length;
    }
    if (logicChangeCount > 0) {
      warnings.push({
        type: 'logic-change',
        severity: 'medium',
        file: currentFile,
        line: lineNumber,
        message: `Logic modification detected (${logicChangeCount} change(s))`,
        code: content.trim()
      });
    }

    // Check for data flow changes
    for (const pattern of BEHAVIOR_PATTERNS.dataFlow) {
      if (pattern.test(content)) {
        info.push({
          type: 'data-flow',
          severity: 'low',
          file: currentFile,
          line: lineNumber,
          message: 'Data transformation logic modified',
          code: content.trim()
        });
      }
    }

    // Check for security concerns
    for (const pattern of BEHAVIOR_PATTERNS.security) {
      if (pattern.test(content)) {
        issues.push({
          type: 'security-risk',
          severity: 'critical',
          file: currentFile,
          line: lineNumber,
          message: 'Potential security risk detected',
          code: content.trim()
        });
      }
    }
  }

  return { issues, warnings, info };
}

function analyzeRemovedCode(diff) {
  const removals = [];
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
      const content = line.substring(1).trim();
      if (content.length > 10) {  // Ignore trivial removals
        removals.push({
          file: currentFile,
          line: lineNumber,
          code: content
        });
      }
    }

    if (line.startsWith('-') || line.startsWith(' ')) lineNumber++;
  }

  return removals;
}

async function analyzePRBehavior(owner, repo, prNumber) {
  try {
    console.log(`Analyzing PR #${prNumber} for behavior changes...`);

    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get the diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff'
      }
    });

    // Analyze the diff
    const analysis = analyzeDiff(diff);
    const removals = analyzeRemovedCode(diff);

    console.log(`Found ${analysis.issues.length} issues, ${analysis.warnings.length} warnings, ${analysis.info.length} info items`);

    // Categorize findings
    const criticalIssues = analysis.issues.filter(i => i.severity === 'critical');
    const highIssues = analysis.issues.filter(i => i.severity === 'high');
    const mediumWarnings = analysis.warnings.filter(w => w.severity === 'medium');

    // Generate detailed review comment
    let reviewComment = `## 🤖 Bob's Intelligent Code Review\n\n`;
    reviewComment += `**PR Analysis Summary:**\n`;
    reviewComment += `- 🔴 Critical Issues: ${criticalIssues.length}\n`;
    reviewComment += `- 🟠 High Priority: ${highIssues.length}\n`;
    reviewComment += `- 🟡 Medium Priority: ${mediumWarnings.length}\n`;
    reviewComment += `- ℹ️ Informational: ${analysis.info.length}\n`;
    reviewComment += `- 📝 Code Removals: ${removals.length}\n\n`;

    // Critical issues
    if (criticalIssues.length > 0) {
      reviewComment += `### 🔴 Critical Issues (Requires Immediate Attention)\n\n`;
      for (const issue of criticalIssues.slice(0, 5)) {
        reviewComment += `**${issue.type}** in \`${issue.file}:${issue.line}\`\n`;
        reviewComment += `- ${issue.message}\n`;
        reviewComment += `\`\`\`\n${issue.code}\n\`\`\`\n\n`;
      }
    }

    // High priority issues
    if (highIssues.length > 0) {
      reviewComment += `### 🟠 High Priority Issues\n\n`;
      for (const issue of highIssues.slice(0, 5)) {
        reviewComment += `**${issue.type}** in \`${issue.file}:${issue.line}\`\n`;
        reviewComment += `- ${issue.message}\n`;
        reviewComment += `\`\`\`\n${issue.code}\n\`\`\`\n\n`;
      }
    }

    // Behavior-impacting changes
    if (mediumWarnings.length > 0) {
      reviewComment += `### 🟡 Behavior-Impacting Changes\n\n`;
      reviewComment += `The following changes may alter existing behavior:\n\n`;
      for (const warning of mediumWarnings.slice(0, 10)) {
        reviewComment += `- \`${warning.file}:${warning.line}\` - ${warning.message}\n`;
      }
      reviewComment += `\n`;
    }

    // Code removals analysis
    if (removals.length > 5) {
      reviewComment += `### 📝 Significant Code Removals\n\n`;
      reviewComment += `⚠️ **${removals.length} lines of code removed** - Please verify:\n`;
      reviewComment += `- Are these intentional deletions?\n`;
      reviewComment += `- Is functionality being moved elsewhere?\n`;
      reviewComment += `- Are there tests covering the removed code?\n\n`;
    }

    // Recommendations
    reviewComment += `### 💡 Recommendations\n\n`;
    if (criticalIssues.length > 0) {
      reviewComment += `- ❌ **Do not merge** until critical issues are resolved\n`;
    }
    if (highIssues.length > 0) {
      reviewComment += `- ⚠️ Review and address high priority issues before merging\n`;
    }
    if (mediumWarnings.length > 5) {
      reviewComment += `- 📋 Consider adding tests for behavior changes\n`;
    }
    if (removals.length > 10) {
      reviewComment += `- 🔍 Verify removed code is no longer needed\n`;
    }

    reviewComment += `\n---\n*This is an automated analysis by Bob. Review carefully and use your judgment.*`;

    // Post the review comment
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: reviewComment
    });

    // Add labels based on severity
    const labels = [];
    if (criticalIssues.length > 0) labels.push('⚠️ critical-review-needed');
    if (highIssues.length > 0) labels.push('review-required');
    if (mediumWarnings.length > 5) labels.push('behavior-change');
    if (removals.length > 10) labels.push('large-deletion');

    if (labels.length > 0) {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels
      });
    }

    console.log('Behavior analysis complete');

    return {
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length,
      warnings: mediumWarnings.length,
      removals: removals.length
    };

  } catch (error) {
    console.error('Error analyzing PR behavior:', error.message);
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

  analyzePRBehavior(owner, repo, prNumber)
    .then(result => {
      console.log('Analysis result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to analyze PR:', error);
      process.exit(1);
    });
}

module.exports = { analyzePRBehavior };

// Made with Bob
