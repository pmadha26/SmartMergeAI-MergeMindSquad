#!/usr/bin/env node

/**
 * PR Description Validator Bot
 * Validates PR descriptions against required template and standards
 */

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const REQUIRED_SECTIONS = [
  { name: 'Description', pattern: /##\s*Description/i },
  { name: 'Changes', pattern: /##\s*(Changes|What Changed)/i },
  { name: 'Testing', pattern: /##\s*(Testing|How to Test)/i }
];

const OPTIONAL_SECTIONS = [
  { name: 'Screenshots', pattern: /##\s*Screenshots/i },
  { name: 'Breaking Changes', pattern: /##\s*Breaking Changes/i },
  { name: 'Related Issues', pattern: /##\s*(Related Issues|Fixes)/i }
];

const MIN_DESCRIPTION_LENGTH = 50;

function validateDescription(description) {
  const issues = [];
  const warnings = [];
  const found = [];

  // Check minimum length
  if (!description || description.trim().length < MIN_DESCRIPTION_LENGTH) {
    issues.push(`Description is too short (minimum ${MIN_DESCRIPTION_LENGTH} characters)`);
  }

  // Check for required sections
  for (const section of REQUIRED_SECTIONS) {
    if (section.pattern.test(description)) {
      found.push(section.name);
    } else {
      issues.push(`Missing required section: ${section.name}`);
    }
  }

  // Check for optional sections (warnings only)
  for (const section of OPTIONAL_SECTIONS) {
    if (!section.pattern.test(description)) {
      warnings.push(`Consider adding section: ${section.name}`);
    }
  }

  // Check for issue references
  const issuePattern = /#\d+|fixes\s+#\d+|closes\s+#\d+/gi;
  const hasIssueReference = issuePattern.test(description);
  if (!hasIssueReference) {
    warnings.push('No issue references found (e.g., #123, fixes #456)');
  }

  // Check for checklist
  const checklistPattern = /- \[[ x]\]/g;
  const hasChecklist = checklistPattern.test(description);
  if (!hasChecklist) {
    warnings.push('No checklist found in description');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    found
  };
}

async function validatePRDescription(owner, repo, prNumber) {
  try {
    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    console.log(`Validating PR #${prNumber}: ${pr.title}`);

    const description = pr.body || '';
    const validation = validateDescription(description);

    console.log('Validation result:', validation);

    // Add or remove label based on validation
    const validLabel = 'pr/valid-description';
    const invalidLabel = 'pr/needs-description';

    const { data: labels } = await octokit.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: prNumber
    });

    const hasValidLabel = labels.some(l => l.name === validLabel);
    const hasInvalidLabel = labels.some(l => l.name === invalidLabel);

    if (validation.valid) {
      // Add valid label, remove invalid label
      if (!hasValidLabel) {
        await octokit.issues.addLabels({
          owner,
          repo,
          issue_number: prNumber,
          labels: [validLabel]
        });
      }
      if (hasInvalidLabel) {
        await octokit.issues.removeLabel({
          owner,
          repo,
          issue_number: prNumber,
          name: invalidLabel
        });
      }

      // Post success comment with warnings if any
      if (validation.warnings.length > 0) {
        const comment = `## ✅ PR Description Valid

Your PR description meets the minimum requirements!

**Suggestions for improvement:**
${validation.warnings.map(w => `- ${w}`).join('\n')}`;

        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: comment
        });
      }

    } else {
      // Add invalid label, remove valid label
      if (!hasInvalidLabel) {
        await octokit.issues.addLabels({
          owner,
          repo,
          issue_number: prNumber,
          labels: [invalidLabel]
        });
      }
      if (hasValidLabel) {
        await octokit.issues.removeLabel({
          owner,
          repo,
          issue_number: prNumber,
          name: validLabel
        });
      }

      // Post validation failure comment
      const comment = `## ❌ PR Description Needs Improvement

Your PR description is missing required information. Please update it to include:

**Issues found:**
${validation.issues.map(i => `- ❌ ${i}`).join('\n')}

${validation.warnings.length > 0 ? `\n**Suggestions:**\n${validation.warnings.map(w => `- ⚠️ ${w}`).join('\n')}` : ''}

**Required sections:**
${REQUIRED_SECTIONS.map(s => `- ${validation.found.includes(s.name) ? '✅' : '❌'} ${s.name}`).join('\n')}

**Template:**
\`\`\`markdown
## Description
Brief description of what this PR does

## Changes
- List of changes made
- Another change

## Testing
How to test these changes

## Related Issues
Fixes #123
\`\`\``;

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });
    }

    console.log(`Validation ${validation.valid ? 'passed' : 'failed'}`);

    return validation;

  } catch (error) {
    console.error('Error validating PR description:', error.message);
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

  validatePRDescription(owner, repo, prNumber)
    .then(result => {
      console.log('Validation complete:', result);
      process.exit(result.valid ? 0 : 1);
    })
    .catch(error => {
      console.error('Failed to validate PR description:', error);
      process.exit(1);
    });
}

module.exports = { validatePRDescription };

// Made with Bob
