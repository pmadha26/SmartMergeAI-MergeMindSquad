#!/usr/bin/env node

/**
 * PR Auto-Fixer Bot
 * Automatically fixes safe issues like formatting, minor conflicts, and missing files
 * Only runs after reviewer approval
 */

const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Safe auto-fix patterns
const AUTO_FIX_PATTERNS = {
  formatting: {
    trailingWhitespace: /\s+$/gm,
    multipleBlankLines: /\n{3,}/g,
    missingNewlineAtEOF: /[^\n]$/,
    inconsistentIndentation: /^( {1,3}|\t+ +| +\t)/gm
  },
  imports: {
    unusedImports: /import\s+.*\s+from\s+['"].*['"];?\s*\n/g,
    duplicateImports: /import\s+.*\s+from\s+['"](.*)['"];?.*\nimport\s+.*\s+from\s+['"]\1['"];?/g
  },
  common: {
    debugStatements: /console\.(log|debug|info)\(.*\);?\n/g,
    todoComments: /\/\/\s*TODO:.*\n/g
  }
};

async function checkIfApproved(owner, repo, prNumber) {
  try {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber
    });

    // Check if there's at least one approval
    const approvals = reviews.filter(review => review.state === 'APPROVED');
    return approvals.length > 0;
  } catch (error) {
    console.error('Error checking approvals:', error.message);
    return false;
  }
}

async function checkMergeConflicts(owner, repo, prNumber) {
  try {
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    return {
      hasConflicts: pr.mergeable === false,
      mergeable: pr.mergeable,
      mergeableState: pr.mergeable_state
    };
  } catch (error) {
    console.error('Error checking merge conflicts:', error.message);
    return { hasConflicts: false, mergeable: null, mergeableState: 'unknown' };
  }
}

function fixFormatting(content, filePath) {
  let fixed = content;
  const fixes = [];

  // Remove trailing whitespace
  const beforeTrailing = fixed;
  fixed = fixed.replace(AUTO_FIX_PATTERNS.formatting.trailingWhitespace, '');
  if (fixed !== beforeTrailing) {
    fixes.push('Removed trailing whitespace');
  }

  // Fix multiple blank lines
  const beforeBlankLines = fixed;
  fixed = fixed.replace(AUTO_FIX_PATTERNS.formatting.multipleBlankLines, '\n\n');
  if (fixed !== beforeBlankLines) {
    fixes.push('Reduced multiple blank lines');
  }

  // Ensure newline at end of file
  if (!fixed.endsWith('\n')) {
    fixed += '\n';
    fixes.push('Added newline at end of file');
  }

  return { fixed, fixes };
}

function removeDebugStatements(content) {
  const fixes = [];
  let fixed = content;

  // Remove console.log statements
  const beforeDebug = fixed;
  fixed = fixed.replace(AUTO_FIX_PATTERNS.common.debugStatements, '');
  if (fixed !== beforeDebug) {
    fixes.push('Removed debug console statements');
  }

  return { fixed, fixes };
}

async function autoFixPR(owner, repo, prNumber) {
  try {
    console.log(`Starting auto-fix for PR #${prNumber}...`);

    // Check if PR is approved
    const isApproved = await checkIfApproved(owner, repo, prNumber);
    if (!isApproved) {
      console.log('PR not yet approved. Auto-fix requires approval.');
      return {
        success: false,
        reason: 'PR requires approval before auto-fix'
      };
    }

    console.log('PR is approved. Proceeding with auto-fix...');

    // Check for merge conflicts
    const conflictStatus = await checkMergeConflicts(owner, repo, prNumber);
    
    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Get changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });

    const fixedFiles = [];
    const allFixes = [];

    // Process each file
    for (const file of files) {
      if (file.status === 'removed') continue;

      // Only auto-fix text files
      const textExtensions = ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.json', '.md', '.yml', '.yaml'];
      const ext = path.extname(file.filename);
      if (!textExtensions.includes(ext)) continue;

      try {
        // Get file content
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: pr.head.ref
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        // Apply fixes
        let { fixed, fixes } = fixFormatting(content, file.filename);
        
        // Remove debug statements if configured
        if (process.env.REMOVE_DEBUG === 'true') {
          const debugResult = removeDebugStatements(fixed);
          fixed = debugResult.fixed;
          fixes = [...fixes, ...debugResult.fixes];
        }

        // If changes were made, update the file
        if (fixed !== content && fixes.length > 0) {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: file.filename,
            message: `🤖 Auto-fix: ${fixes.join(', ')}`,
            content: Buffer.from(fixed).toString('base64'),
            sha: fileData.sha,
            branch: pr.head.ref
          });

          fixedFiles.push({
            file: file.filename,
            fixes
          });
          allFixes.push(...fixes);
        }
      } catch (error) {
        console.error(`Error fixing file ${file.filename}:`, error.message);
      }
    }

    // Post summary comment
    if (fixedFiles.length > 0) {
      const comment = `## 🤖 Bob's Auto-Fix Applied

**Fixed ${fixedFiles.length} file(s) automatically:**

${fixedFiles.map(f => `- \`${f.file}\`\n  ${f.fixes.map(fix => `  - ${fix}`).join('\n')}`).join('\n')}

**Summary of fixes:**
${[...new Set(allFixes)].map(fix => `- ✅ ${fix}`).join('\n')}

These are safe, non-behavior-changing fixes applied after approval.`;

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });

      // Add label
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: ['auto-fixed']
      });
    }

    console.log(`Auto-fix complete. Fixed ${fixedFiles.length} files.`);

    return {
      success: true,
      filesFixed: fixedFiles.length,
      fixes: allFixes,
      conflictStatus
    };

  } catch (error) {
    console.error('Error in auto-fix:', error.message);
    throw error;
  }
}

async function attemptMergeConflictResolution(owner, repo, prNumber) {
  try {
    console.log('Attempting to resolve merge conflicts...');

    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    // Try to update branch with base
    try {
      await octokit.pulls.updateBranch({
        owner,
        repo,
        pull_number: prNumber
      });

      const comment = `## 🤖 Bob's Merge Conflict Resolution

✅ Successfully updated branch with latest changes from \`${pr.base.ref}\`.

Please verify the changes and ensure tests pass.`;

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });

      return { success: true, method: 'branch-update' };
    } catch (error) {
      console.error('Could not auto-resolve conflicts:', error.message);
      
      const comment = `## 🤖 Bob's Merge Conflict Detection

⚠️ This PR has merge conflicts that require manual resolution.

**Steps to resolve:**
1. Pull the latest changes from \`${pr.base.ref}\`
2. Merge \`${pr.base.ref}\` into your branch
3. Resolve conflicts manually
4. Push the resolved changes

\`\`\`bash
git checkout ${pr.head.ref}
git pull origin ${pr.base.ref}
# Resolve conflicts
git add .
git commit -m "Resolve merge conflicts"
git push
\`\`\``;

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });

      return { success: false, method: 'manual-required' };
    }
  } catch (error) {
    console.error('Error resolving conflicts:', error.message);
    return { success: false, error: error.message };
  }
}

// Main execution
if (require.main === module) {
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY_NAME;
  const prNumber = parseInt(process.env.PR_NUMBER);
  const action = process.env.AUTO_FIX_ACTION || 'fix'; // 'fix' or 'resolve-conflicts'

  if (!owner || !repo || !prNumber) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const runAction = action === 'resolve-conflicts' 
    ? attemptMergeConflictResolution(owner, repo, prNumber)
    : autoFixPR(owner, repo, prNumber);

  runAction
    .then(result => {
      console.log('Auto-fix result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Failed to auto-fix PR:', error);
      process.exit(1);
    });
}

module.exports = { autoFixPR, attemptMergeConflictResolution };

// Made with Bob
