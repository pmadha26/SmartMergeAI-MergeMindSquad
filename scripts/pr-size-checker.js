#!/usr/bin/env node

/**
 * PR Size Checker Bot
 * Analyzes PR size and adds appropriate labels
 */

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const SIZE_THRESHOLDS = {
  xs: 10,
  small: 50,
  medium: 200,
  large: 500,
  xlarge: 1000
};

async function analyzePRSize(owner, repo, prNumber) {
  try {
    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    const additions = pr.additions;
    const deletions = pr.deletions;
    const totalChanges = additions + deletions;
    const filesChanged = pr.changed_files;

    console.log(`PR #${prNumber}: ${pr.title}`);
    console.log(`Total changes: ${totalChanges} (+${additions} -${deletions})`);
    console.log(`Files changed: ${filesChanged}`);

    // Determine size label
    let sizeLabel;
    if (totalChanges <= SIZE_THRESHOLDS.xs) {
      sizeLabel = 'size/xs';
    } else if (totalChanges <= SIZE_THRESHOLDS.small) {
      sizeLabel = 'size/small';
    } else if (totalChanges <= SIZE_THRESHOLDS.medium) {
      sizeLabel = 'size/medium';
    } else if (totalChanges <= SIZE_THRESHOLDS.large) {
      sizeLabel = 'size/large';
    } else {
      sizeLabel = 'size/xlarge';
    }

    // Remove existing size labels
    const { data: labels } = await octokit.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: prNumber
    });

    const existingSizeLabels = labels
      .filter(label => label.name.startsWith('size/'))
      .map(label => label.name);

    for (const label of existingSizeLabels) {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: label
      });
    }

    // Add new size label
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: [sizeLabel]
    });

    console.log(`Added label: ${sizeLabel}`);

    // Post comment if PR is too large
    if (totalChanges > SIZE_THRESHOLDS.large) {
      const comment = `## ⚠️ Large PR Detected

This PR has **${totalChanges}** lines changed across **${filesChanged}** files.

Consider breaking this PR into smaller, more focused changes for easier review:
- Smaller PRs are easier to review and merge
- Reduces risk of introducing bugs
- Faster feedback cycle
- Better git history

**Suggestions:**
- Split by feature or component
- Separate refactoring from new features
- Create a tracking issue for the overall change`;

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });

      console.log('Posted large PR warning comment');
    }

    return {
      sizeLabel,
      totalChanges,
      filesChanged
    };

  } catch (error) {
    console.error('Error analyzing PR size:', error.message);
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

  analyzePRSize(owner, repo, prNumber)
    .then(result => {
      console.log('Analysis complete:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to analyze PR:', error);
      process.exit(1);
    });
}

module.exports = { analyzePRSize };


