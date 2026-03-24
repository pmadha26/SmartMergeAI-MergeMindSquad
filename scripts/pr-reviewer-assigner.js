#!/usr/bin/env node

/**
 * PR Reviewer Auto-Assigner Bot
 * Automatically assigns reviewers based on file changes and team ownership
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Load CODEOWNERS file or use default mapping
const TEAM_OWNERSHIP = {
  'frontend': {
    patterns: ['**/*.tsx', '**/*.jsx', '**/*.css', '**/*.scss', '**/components/**', '**/*.ts', '**/*.js'],
    reviewers: ['pmadhavi14']
  },
  'backend': {
    patterns: ['**/*.java', '**/*.py', '**/api/**', '**/services/**'],
    reviewers: ['pmadhavi14']
  },
  'devops': {
    patterns: ['**/*.yml', '**/*.yaml', 'Dockerfile', '**/kubernetes/**', '.github/**'],
    reviewers: ['pmadhavi14']
  },
  'database': {
    patterns: ['**/*.sql', '**/migrations/**', '**/schema/**'],
    reviewers: ['pmadhavi14']
  }
};

/**
 * Extract username from GitHub URL or return as-is
 */
function extractUsername(reviewer) {
  // If it's a GitHub URL, extract the username
  const urlMatch = reviewer.match(/github\.com\/([^\/]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Otherwise return as-is (already a username)
  return reviewer;
}

function matchesPattern(filePath, pattern) {
  const regex = new RegExp(
    pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
  );
  return regex.test(filePath);
}

function getReviewersForFiles(files) {
  const reviewers = new Set();
  const teams = new Set();

  for (const file of files) {
    for (const [team, config] of Object.entries(TEAM_OWNERSHIP)) {
      for (const pattern of config.patterns) {
        if (matchesPattern(file.filename, pattern)) {
          teams.add(team);
          // Extract usernames from URLs and add to reviewers
          config.reviewers.forEach(reviewer => {
            const username = extractUsername(reviewer);
            if (username) {
              reviewers.add(username);
            }
          });
          break;
        }
      }
    }
  }

  return {
    reviewers: Array.from(reviewers),
    teams: Array.from(teams)
  };
}

async function assignReviewers(owner, repo, prNumber) {
  try {
    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    const prAuthor = pr.user.login;
    console.log(`PR #${prNumber} by ${prAuthor}: ${pr.title}`);

    // Get changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });

    console.log(`Changed files: ${files.length}`);

    // Determine reviewers based on changed files
    const { reviewers, teams } = getReviewersForFiles(files);

    // Remove PR author from reviewers
    const filteredReviewers = reviewers.filter(r => r !== prAuthor);

    if (filteredReviewers.length === 0) {
      console.log('No reviewers to assign');
      return;
    }

    console.log(`Assigning reviewers: ${filteredReviewers.join(', ')}`);
    console.log(`Affected teams: ${teams.join(', ')}`);

    // Assign reviewers
    try {
      console.log(`Attempting to assign reviewers to ${owner}/${repo}#${prNumber}`);
      console.log(`Reviewers to assign: ${JSON.stringify(filteredReviewers)}`);
      
      const result = await octokit.pulls.requestReviewers({
        owner,
        repo,
        pull_number: prNumber,
        reviewers: filteredReviewers
      });
      
      console.log('✅ Reviewers assigned successfully');
      console.log(`Response status: ${result.status}`);
      console.log(`Assigned reviewers: ${result.data.requested_reviewers.map(r => r.login).join(', ')}`);
    } catch (error) {
      console.error('❌ Error assigning reviewers:');
      console.error(`  Message: ${error.message}`);
      console.error(`  Status: ${error.status}`);
      console.error(`  Response: ${JSON.stringify(error.response?.data, null, 2)}`);
      
      // Common issues and solutions
      if (error.status === 422) {
        console.error('\n⚠️  Possible reasons:');
        console.error('  1. Reviewer username is incorrect');
        console.error('  2. Reviewer does not have access to the repository');
        console.error('  3. Reviewer is the PR author (already filtered)');
        console.error('  4. Repository does not allow review requests');
      } else if (error.status === 403) {
        console.error('\n⚠️  Permission denied:');
        console.error('  1. GitHub token does not have sufficient permissions');
        console.error('  2. Token needs "repo" or "write:org" scope');
      }
      
      // Don't throw, continue with other operations
    }

    // Add team labels
    if (teams.length > 0) {
      const teamLabels = teams.map(team => `team/${team}`);
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: teamLabels
      });
      console.log(`Added team labels: ${teamLabels.join(', ')}`);
    }

    // Check if comment already exists to avoid duplicates
    const { data: existingComments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    const botComment = existingComments.find(comment =>
      comment.user.type === 'Bot' &&
      comment.body.includes('🤖 Auto-Assigned Reviewers')
    );

    const comment = `## 🤖 Auto-Assigned Reviewers

**Reviewers assigned:** ${filteredReviewers.map(r => `@${r}`).join(', ')}

**Teams involved:** ${teams.join(', ')}

**Files changed by category:**
${teams.map(team => {
  const teamFiles = files.filter(file =>
    TEAM_OWNERSHIP[team].patterns.some(pattern => matchesPattern(file.filename, pattern))
  );
  return `- **${team}**: ${teamFiles.length} file(s)`;
}).join('\n')}

*Reviewers were automatically assigned based on file changes and team ownership.*`;

    if (botComment) {
      // Update existing comment instead of creating new one
      await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: botComment.id,
        body: comment
      });
      console.log('Updated existing reviewer assignment comment');
    } else {
      // Create new comment
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });
      console.log('Posted reviewer assignment comment');
    }

    return {
      reviewers: filteredReviewers,
      teams
    };

  } catch (error) {
    console.error('Error assigning reviewers:', error.message);
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
    console.error('Required: GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY_NAME, PR_NUMBER');
    process.exit(1);
  }

  assignReviewers(owner, repo, prNumber)
    .then(result => {
      console.log('Reviewer assignment complete:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to assign reviewers:', error);
      process.exit(1);
    });
}

module.exports = { assignReviewers };


