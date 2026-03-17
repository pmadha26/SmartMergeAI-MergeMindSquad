#!/usr/bin/env node

/**
 * Merge Conflict Detector for PRs
 * 
 * Detects and analyzes merge conflicts between PR branch and base branch
 * Provides detailed conflict information and resolution suggestions
 */

const { execSync } = require('child_process');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY_NAME;
const prNumber = parseInt(process.env.PR_NUMBER);
const baseRef = process.env.BASE_REF;
const headRef = process.env.HEAD_REF;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class MergeConflictDetector {
  constructor() {
    this.conflicts = [];
    this.conflictDetails = new Map();
  }

  /**
   * Detect merge conflicts
   */
  async detectConflicts() {
    console.log(`${colors.bold}${colors.cyan}🔍 Detecting Merge Conflicts${colors.reset}\n`);
    console.log(`Base: ${baseRef} <- Head: ${headRef}\n`);

    try {
      // Fetch both branches
      execSync(`git fetch origin ${baseRef}`, { stdio: 'pipe' });
      execSync(`git fetch origin ${headRef}`, { stdio: 'pipe' });

      // Get merge base
      const mergeBase = execSync(
        `git merge-base origin/${baseRef} origin/${headRef}`,
        { encoding: 'utf-8' }
      ).trim();

      console.log(`Merge base: ${mergeBase.substring(0, 8)}\n`);

      // Try merge simulation to detect conflicts
      const conflicts = await this.simulateMerge(baseRef, headRef);

      if (conflicts.length === 0) {
        console.log(`${colors.green}✅ No merge conflicts detected${colors.reset}`);
        await this.postNoConflictsComment();
        // Set GitHub Actions output (FIXED: Using new syntax)
        if (process.env.GITHUB_OUTPUT) {
          const fs = require('fs');
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_conflicts=false\n');
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'can_auto_resolve=false\n');
        }
        return { hasConflicts: false, conflicts: [] };
      }

      console.log(`${colors.red}⚠️  Found ${conflicts.length} conflicted file(s)${colors.reset}\n`);

      // Analyze each conflict
      for (const file of conflicts) {
        await this.analyzeConflict(file, baseRef, headRef);
      }

      // Determine if conflicts can be auto-resolved
      const canAutoResolve = this.canAutoResolveConflicts();
      console.log(`\nAuto-resolve capability: ${canAutoResolve ? 'YES' : 'NO'}`);

      // Post detailed comment
      await this.postConflictComment(canAutoResolve);

      // Set GitHub Actions outputs (FIXED: Using new syntax)
      if (process.env.GITHUB_OUTPUT) {
        const fs = require('fs');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_conflicts=true\n');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `can_auto_resolve=${canAutoResolve}\n`);
      }

      return { hasConflicts: true, conflicts: this.conflicts, canAutoResolve };

    } catch (error) {
      console.error(`${colors.red}❌ Error detecting conflicts: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Simulate merge to detect conflicts
   */
  async simulateMerge(baseRef, headRef) {
    try {
      // FIRST: Check GitHub API mergeable status (most reliable)
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });

      console.log(`GitHub mergeable status: ${pr.mergeable}`);
      console.log(`GitHub mergeable_state: ${pr.mergeable_state}`);

      // If GitHub says not mergeable, there are conflicts
      if (pr.mergeable === false) {
        console.log(`${colors.yellow}⚠️  GitHub API reports conflicts${colors.reset}`);
        return await this.getConflictedFilesFromAPI();
      }

      // If mergeable is null, GitHub is still calculating - wait and retry
      if (pr.mergeable === null) {
        console.log(`${colors.yellow}⏳ GitHub still calculating mergeable status, waiting...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.simulateMerge(baseRef, headRef);
      }

      // SECOND: Try git merge-tree as backup
      const output = execSync(
        `git merge-tree $(git merge-base origin/${baseRef} origin/${headRef}) origin/${baseRef} origin/${headRef}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      // Parse output for conflict markers
      const conflictFiles = new Set();
      const lines = output.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for conflict markers in merge-tree output
        if (line.includes('<<<<<<<') || line.includes('=======') || line.includes('>>>>>>>')) {
          // Find the file path in previous lines
          for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
            const match = lines[j].match(/^\+\+\+ b\/(.+)$/);
            if (match) {
              conflictFiles.add(match[1]);
              break;
            }
          }
        }
      }

      return Array.from(conflictFiles);

    } catch (error) {
      console.error(`${colors.yellow}⚠️  Error in simulateMerge: ${error.message}${colors.reset}`);
      // If both methods fail, try alternative
      return await this.detectConflictsAlternative(baseRef, headRef);
    }
  }

  /**
   * Get conflicted files from GitHub API
   */
  async getConflictedFilesFromAPI() {
    try {
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber
      });

      // Return all changed files as potentially conflicted
      // The actual conflict analysis will happen in analyzeConflict
      return files.map(f => f.filename);
    } catch (error) {
      console.error(`Error getting files from API: ${error.message}`);
      return [];
    }
  }

  /**
   * Alternative conflict detection method
   */
  async detectConflictsAlternative(baseRef, headRef) {
    try {
      // Check mergeable status from GitHub API
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });

      if (pr.mergeable === false) {
        // Get list of changed files
        const { data: files } = await octokit.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber
        });

        // Return files that might have conflicts
        return files
          .filter(f => f.status === 'modified')
          .map(f => f.filename);
      }

      return [];
    } catch (error) {
      console.log(`${colors.yellow}Note: Could not determine conflicts via API${colors.reset}`);
      return [];
    }
  }

  /**
   * Analyze specific conflict
   */
  async analyzeConflict(file, baseRef, headRef) {
    console.log(`${colors.yellow}📄 Analyzing: ${file}${colors.reset}`);

    try {
      // Get file content from both branches
      const baseContent = await this.getFileContent(file, `origin/${baseRef}`);
      const headContent = await this.getFileContent(file, `origin/${headRef}`);

      // Perform diff analysis
      const diffOutput = execSync(
        `git diff origin/${baseRef}...origin/${headRef} -- "${file}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );

      const conflictInfo = {
        file,
        baseLines: baseContent ? baseContent.split('\n').length : 0,
        headLines: headContent ? headContent.split('\n').length : 0,
        diffStats: this.parseDiffStats(diffOutput),
        conflictType: this.determineConflictType(diffOutput),
        suggestions: this.generateSuggestions(file, diffOutput)
      };

      this.conflicts.push(conflictInfo);
      this.conflictDetails.set(file, conflictInfo);

      console.log(`  Type: ${conflictInfo.conflictType}`);
      console.log(`  Base: ${conflictInfo.baseLines} lines, Head: ${conflictInfo.headLines} lines`);
      console.log(`  Changes: +${conflictInfo.diffStats.additions} -${conflictInfo.diffStats.deletions}\n`);

    } catch (error) {
      console.log(`  ${colors.red}Could not analyze: ${error.message}${colors.reset}\n`);
    }
  }

  /**
   * Get file content from specific ref
   */
  async getFileContent(file, ref) {
    try {
      return execSync(`git show ${ref}:"${file}"`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse diff statistics
   */
  parseDiffStats(diffOutput) {
    const additions = (diffOutput.match(/^\+[^+]/gm) || []).length;
    const deletions = (diffOutput.match(/^-[^-]/gm) || []).length;
    return { additions, deletions };
  }

  /**
   * Determine conflict type
   */
  determineConflictType(diffOutput) {
    const stats = this.parseDiffStats(diffOutput);
    
    if (stats.additions > 0 && stats.deletions === 0) {
      return 'Addition conflict';
    } else if (stats.additions === 0 && stats.deletions > 0) {
      return 'Deletion conflict';
    } else if (stats.additions > stats.deletions * 2) {
      return 'Major addition with modifications';
    } else if (stats.deletions > stats.additions * 2) {
      return 'Major deletion with modifications';
    } else {
      return 'Modification conflict';
    }
  }

  /**
   * Generate resolution suggestions
   */
  generateSuggestions(file, diffOutput) {
    const suggestions = [];
    const ext = file.split('.').pop();

    // File-type specific suggestions
    if (ext === 'json' && file.includes('package')) {
      suggestions.push('Merge package.json dependencies carefully - consider using both sets');
      suggestions.push('Run `npm install` after resolving to update lock file');
    } else if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
      if (diffOutput.includes('import ')) {
        suggestions.push('Merge import statements - keep all unique imports');
      }
      if (diffOutput.includes('export ')) {
        suggestions.push('Ensure all exports are preserved from both branches');
      }
    } else if (['css', 'scss', 'less'].includes(ext)) {
      suggestions.push('Review style changes carefully to avoid visual regressions');
    }

    // General suggestions
    const stats = this.parseDiffStats(diffOutput);
    if (stats.additions > 50 || stats.deletions > 50) {
      suggestions.push('Large conflict - consider manual review and testing');
    }

    if (suggestions.length === 0) {
      suggestions.push('Review changes carefully and test after resolution');
    }

    return suggestions;
  }

  /**
   * Determine if conflicts can be auto-resolved
   */
  canAutoResolveConflicts() {
    // Check if all conflicts are simple and safe to auto-resolve
    for (const conflict of this.conflicts) {
      // Don't auto-resolve if too many changes
      if (conflict.diffStats.additions > 20 || conflict.diffStats.deletions > 20) {
        return false;
      }

      // Don't auto-resolve certain file types
      const ext = conflict.file.split('.').pop();
      const dangerousExtensions = ['sql', 'db', 'lock', 'config', 'env'];
      if (dangerousExtensions.includes(ext)) {
        return false;
      }

      // Only auto-resolve addition conflicts or simple modifications
      if (!['Addition conflict', 'Modification conflict'].includes(conflict.conflictType)) {
        return false;
      }
    }

    // Only auto-resolve if 3 or fewer files
    return this.conflicts.length <= 3;
  }

  /**
   * Post no conflicts comment
   */
  async postNoConflictsComment() {
    const comment = `## ✅ No Merge Conflicts Detected

**PR #${prNumber}** can be merged cleanly into \`${baseRef}\`

---
*Automated by Bob's Merge Conflict Detector* 🤖`;

    try {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });
    } catch (error) {
      console.error('Failed to post comment:', error.message);
    }
  }

  /**
   * Post detailed conflict comment
   */
  async postConflictComment(canAutoResolve = false) {
    let comment = `## ⚠️ Merge Conflicts Detected

**PR #${prNumber}** has conflicts with \`${baseRef}\` that need to be resolved.

### 📋 Conflicted Files (${this.conflicts.length})

`;

    for (const conflict of this.conflicts) {
      comment += `#### 📄 \`${conflict.file}\`

- **Conflict Type:** ${conflict.conflictType}
- **Changes:** +${conflict.diffStats.additions} lines, -${conflict.diffStats.deletions} lines
- **Base Branch:** ${conflict.baseLines} lines
- **Your Branch:** ${conflict.headLines} lines

**💡 Resolution Suggestions:**
`;
      
      for (const suggestion of conflict.suggestions) {
        comment += `- ${suggestion}\n`;
      }
      
      comment += '\n';
    }

    comment += `---
`;

    // Add auto-resolve section if applicable
    if (canAutoResolve) {
      comment += `
### 🤖 Auto-Resolution Available

These conflicts appear to be simple and can be **automatically resolved** by Bob!

**To enable auto-resolution:**
1. Review the conflicts above
2. Approve this PR (if you haven't already)
3. Bob will automatically resolve and commit the changes

**Note:** Auto-resolution only works for:
- Simple addition conflicts
- Small modifications (< 20 lines)
- Safe file types (excludes .sql, .db, .lock, .config, .env)
- 3 or fewer conflicted files

---
`;
    }

    comment += `
### 🔧 How to Resolve Manually

1. **Pull latest changes from base branch:**
   \`\`\`bash
   git fetch origin ${baseRef}
   git merge origin/${baseRef}
   \`\`\`

2. **Resolve conflicts in each file:**
   - Open conflicted files in your editor
   - Look for conflict markers: \`<<<<<<<\`, \`=======\`, \`>>>>>>>\`
   - Choose which changes to keep or merge both
   - Remove conflict markers

3. **Test your changes:**
   \`\`\`bash
   # Run tests
   npm test
   
   # Run linting
   npm run lint
   \`\`\`

4. **Commit and push:**
   \`\`\`bash
   git add .
   git commit -m "Resolve merge conflicts with ${baseRef}"
   git push
   \`\`\`

---

### 📚 Resources

- [GitHub: Resolving Merge Conflicts](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line)
- [Git: Merge Conflicts](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)

---
*Automated by Bob's Merge Conflict Detector* 🤖`;

    try {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });
      
      console.log(`${colors.green}✅ Posted conflict analysis comment${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Failed to post comment: ${error.message}${colors.reset}`);
    }
  }
}

// Main execution
async function main() {
  if (!owner || !repo || !prNumber || !baseRef || !headRef) {
    console.error('Missing required environment variables');
    console.error('Required: GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY_NAME, PR_NUMBER, BASE_REF, HEAD_REF');
    process.exit(1);
  }

  const detector = new MergeConflictDetector();
  
  try {
    const result = await detector.detectConflicts();
    
    if (result.hasConflicts) {
      console.log(`\n${colors.yellow}⚠️  Merge conflicts detected - manual resolution required${colors.reset}`);
      process.exit(0); // Don't fail the workflow, just inform
    } else {
      console.log(`\n${colors.green}✅ No conflicts - PR is ready to merge${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();

// Made with Bob
