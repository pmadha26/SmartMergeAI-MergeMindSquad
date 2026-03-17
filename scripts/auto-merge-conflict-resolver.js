#!/usr/bin/env node

/**
 * Automatic Merge Conflict Resolver
 * 
 * Attempts to automatically resolve common merge conflicts in PRs
 * Strategies:
 * 1. Accept both changes for non-conflicting additions
 * 2. Keep newer changes for simple conflicts
 * 3. Merge import statements intelligently
 * 4. Resolve package.json conflicts
 * 5. Handle whitespace/formatting conflicts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

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

class MergeConflictResolver {
  constructor() {
    this.resolvedFiles = [];
    this.unresolvedFiles = [];
    this.strategies = {
      imports: this.resolveImportConflicts.bind(this),
      packageJson: this.resolvePackageJsonConflicts.bind(this),
      whitespace: this.resolveWhitespaceConflicts.bind(this),
      additions: this.resolveAdditionConflicts.bind(this),
      simple: this.resolveSimpleConflicts.bind(this)
    };
  }

  /**
   * Main resolution entry point
   */
  async resolve(owner, repo, prNumber, baseBranch) {
    console.log(`${colors.bold}${colors.cyan}🔀 Automatic Merge Conflict Resolver${colors.reset}\n`);

    try {
      // Get PR details
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });

      console.log(`PR #${prNumber}: ${pr.title}`);
      console.log(`Base: ${pr.base.ref} <- Head: ${pr.head.ref}\n`);

      // Check for conflicts
      const conflicts = await this.detectConflicts(pr.base.ref, pr.head.ref);

      if (conflicts.length === 0) {
        console.log(`${colors.green}✅ No merge conflicts detected${colors.reset}`);
        return { success: true, resolved: [], unresolved: [] };
      }

      console.log(`${colors.yellow}⚠️  Found ${conflicts.length} conflicted file(s)${colors.reset}\n`);

      // Attempt to resolve each conflict
      for (const file of conflicts) {
        await this.resolveFileConflict(file);
      }

      // Display results
      this.displayResults();

      // Post comment to PR
      await this.postResultComment(owner, repo, prNumber);

      // Stage resolved files
      if (this.resolvedFiles.length > 0) {
        this.resolvedFiles.forEach(file => {
          try {
            execSync(`git add "${file}"`, { stdio: 'pipe' });
          } catch (error) {
            console.error(`Failed to stage ${file}: ${error.message}`);
          }
        });
      }

      return {
        success: this.unresolvedFiles.length === 0,
        resolved: this.resolvedFiles,
        unresolved: this.unresolvedFiles
      };

    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Detect conflicted files
   */
  async detectConflicts(baseBranch, headBranch) {
    try {
      // Try to merge and detect conflicts
      execSync(`git fetch origin ${baseBranch}`, { stdio: 'pipe' });
      
      // Get list of conflicted files
      const output = execSync(
        `git diff --name-only --diff-filter=U`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();

      if (!output) {
        // No conflicts in working directory, check if merge would conflict
        try {
          execSync(
            `git merge-tree $(git merge-base HEAD origin/${baseBranch}) HEAD origin/${baseBranch}`,
            { stdio: 'pipe' }
          );
          return [];
        } catch (error) {
          // Parse merge-tree output for conflicts
          const conflicts = error.stdout.toString().match(/\+<<<<<<<.*?\+>>>>>>>/gs);
          if (conflicts) {
            // Extract file names from conflicts
            const files = new Set();
            conflicts.forEach(conflict => {
              const match = conflict.match(/\+\+\+ b\/(.*)/);
              if (match) files.add(match[1]);
            });
            return Array.from(files);
          }
        }
      }

      return output.split('\n').filter(f => f);
    } catch (error) {
      console.log(`${colors.yellow}Note: Could not detect conflicts automatically${colors.reset}`);
      return [];
    }
  }

  /**
   * Resolve conflicts in a single file
   */
  async resolveFileConflict(filePath) {
    console.log(`${colors.blue}📄 Processing: ${filePath}${colors.reset}`);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`  ${colors.yellow}⚠️  File not found, skipping${colors.reset}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if file has conflict markers
      if (!content.includes('<<<<<<<')) {
        console.log(`  ${colors.green}✅ No conflict markers found${colors.reset}`);
        return;
      }

      // Try different resolution strategies
      let resolved = false;
      let resolvedContent = content;

      for (const [strategyName, strategy] of Object.entries(this.strategies)) {
        try {
          const result = strategy(resolvedContent, filePath);
          if (result.resolved) {
            resolvedContent = result.content;
            resolved = true;
            console.log(`  ${colors.green}✅ Resolved using ${strategyName} strategy${colors.reset}`);
            break;
          }
        } catch (error) {
          // Strategy failed, try next one
          continue;
        }
      }

      if (resolved) {
        fs.writeFileSync(filePath, resolvedContent, 'utf-8');
        this.resolvedFiles.push(filePath);
      } else {
        console.log(`  ${colors.red}❌ Could not auto-resolve${colors.reset}`);
        this.unresolvedFiles.push(filePath);
      }

    } catch (error) {
      console.error(`  ${colors.red}❌ Error: ${error.message}${colors.reset}`);
      this.unresolvedFiles.push(filePath);
    }
  }

  /**
   * Strategy 1: Resolve import conflicts
   */
  resolveImportConflicts(content, filePath) {
    if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
      return { resolved: false };
    }

    const conflicts = content.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/g);
    if (!conflicts) {
      return { resolved: false };
    }

    let resolved = true;
    let newContent = content;

    conflicts.forEach(conflict => {
      const match = conflict.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/);
      if (!match) return;

      const ours = match[1];
      const theirs = match[2];

      // Check if both sides are import statements
      const oursImports = ours.match(/^import .* from .*;$/gm) || [];
      const theirsImports = theirs.match(/^import .* from .*;$/gm) || [];

      if (oursImports.length > 0 || theirsImports.length > 0) {
        // Merge imports (keep both, remove duplicates)
        const allImports = [...new Set([...oursImports, ...theirsImports])];
        const mergedImports = allImports.sort().join('\n');
        newContent = newContent.replace(conflict, mergedImports + '\n');
      } else {
        resolved = false;
      }
    });

    return { resolved, content: newContent };
  }

  /**
   * Strategy 2: Resolve package.json conflicts
   */
  resolvePackageJsonConflicts(content, filePath) {
    if (!filePath.endsWith('package.json')) {
      return { resolved: false };
    }

    try {
      // Extract both versions
      const match = content.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/);
      if (!match) return { resolved: false };

      const ours = match[1];
      const theirs = match[2];

      // Try to parse both as JSON
      const oursJson = JSON.parse(ours);
      const theirsJson = JSON.parse(theirs);

      // Merge dependencies intelligently
      const merged = this.mergePackageJson(oursJson, theirsJson);
      const mergedContent = JSON.stringify(merged, null, 2);

      const newContent = content.replace(
        /<<<<<<< .*?\n[\s\S]*?\n=======\n[\s\S]*?\n>>>>>>> .*?\n/,
        mergedContent
      );

      return { resolved: true, content: newContent };
    } catch (error) {
      return { resolved: false };
    }
  }

  /**
   * Merge package.json objects
   */
  mergePackageJson(ours, theirs) {
    const merged = { ...ours };

    // Merge dependencies
    if (theirs.dependencies) {
      merged.dependencies = { ...ours.dependencies, ...theirs.dependencies };
    }

    // Merge devDependencies
    if (theirs.devDependencies) {
      merged.devDependencies = { ...ours.devDependencies, ...theirs.devDependencies };
    }

    // Merge scripts
    if (theirs.scripts) {
      merged.scripts = { ...ours.scripts, ...theirs.scripts };
    }

    return merged;
  }

  /**
   * Strategy 3: Resolve whitespace/formatting conflicts
   */
  resolveWhitespaceConflicts(content, filePath) {
    const conflicts = content.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/g);
    if (!conflicts) return { resolved: false };

    let resolved = true;
    let newContent = content;

    conflicts.forEach(conflict => {
      const match = conflict.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/);
      if (!match) return;

      const ours = match[1];
      const theirs = match[2];

      // Normalize whitespace
      const oursNormalized = ours.trim().replace(/\s+/g, ' ');
      const theirsNormalized = theirs.trim().replace(/\s+/g, ' ');

      // If content is same after normalization, keep one version
      if (oursNormalized === theirsNormalized) {
        newContent = newContent.replace(conflict, theirs);
      } else {
        resolved = false;
      }
    });

    return { resolved, content: newContent };
  }

  /**
   * Strategy 4: Resolve addition-only conflicts
   */
  resolveAdditionConflicts(content, filePath) {
    const conflicts = content.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/g);
    if (!conflicts) return { resolved: false };

    let resolved = true;
    let newContent = content;

    conflicts.forEach(conflict => {
      const match = conflict.match(/<<<<<<< .*?\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/);
      if (!match) return;

      const ours = match[1];
      const theirs = match[2];

      // If one side is empty, keep the other
      if (ours.trim() === '' && theirs.trim() !== '') {
        newContent = newContent.replace(conflict, theirs);
      } else if (theirs.trim() === '' && ours.trim() !== '') {
        newContent = newContent.replace(conflict, ours);
      } else {
        // Both sides have content, try to merge
        // Keep both if they don't overlap
        const merged = ours + '\n' + theirs;
        newContent = newContent.replace(conflict, merged);
      }
    });

    return { resolved, content: newContent };
  }

  /**
   * Strategy 5: Resolve simple conflicts (prefer newer/theirs)
   */
  resolveSimpleConflicts(content, filePath) {
    // As last resort, prefer the incoming changes (theirs)
    const newContent = content.replace(
      /<<<<<<< .*?\n[\s\S]*?\n=======\n([\s\S]*?)\n>>>>>>> .*?\n/g,
      '$1'
    );

    return {
      resolved: !newContent.includes('<<<<<<<'),
      content: newContent
    };
  }

  /**
   * Display resolution results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}${colors.cyan}📊 Resolution Results${colors.reset}`);
    console.log('='.repeat(80) + '\n');

    if (this.resolvedFiles.length > 0) {
      console.log(`${colors.green}✅ Resolved (${this.resolvedFiles.length}):${colors.reset}`);
      this.resolvedFiles.forEach(file => console.log(`   - ${file}`));
      console.log();
    }

    if (this.unresolvedFiles.length > 0) {
      console.log(`${colors.red}❌ Unresolved (${this.unresolvedFiles.length}):${colors.reset}`);
      this.unresolvedFiles.forEach(file => console.log(`   - ${file}`));
      console.log();
    }

    console.log('='.repeat(80));
    if (this.unresolvedFiles.length === 0) {
      console.log(`${colors.green}${colors.bold}✅ All conflicts resolved!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}${colors.bold}⚠️  Some conflicts require manual resolution${colors.reset}`);
    }
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Post results as PR comment
   */
  async postResultComment(owner, repo, prNumber) {
    const comment = `## 🔀 Automatic Merge Conflict Resolution

${this.resolvedFiles.length > 0 ? `### ✅ Auto-Resolved (${this.resolvedFiles.length})
${this.resolvedFiles.map(f => `- \`${f}\``).join('\n')}
` : ''}
${this.unresolvedFiles.length > 0 ? `### ❌ Requires Manual Resolution (${this.unresolvedFiles.length})
${this.unresolvedFiles.map(f => `- \`${f}\``).join('\n')}

**Action Required:** Please resolve these conflicts manually.
` : ''}
${this.unresolvedFiles.length === 0 ? '### 🎉 All Conflicts Resolved!\n\nAll merge conflicts have been automatically resolved. Please review the changes.' : ''}

---
*Automated by Merge Conflict Resolver*`;

    try {
      // Check for existing comment
      const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber
      });

      const existingComment = comments.find(c => 
        c.user.type === 'Bot' && 
        c.body.includes('🔀 Automatic Merge Conflict Resolution')
      );

      if (existingComment) {
        await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: comment
        });
      } else {
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: comment
        });
      }
    } catch (error) {
      console.error(`Failed to post comment: ${error.message}`);
    }
  }
}

// Main execution
if (require.main === module) {
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY_NAME;
  const prNumber = parseInt(process.env.PR_NUMBER);
  const baseBranch = process.env.BASE_BRANCH || 'main';

  if (!owner || !repo || !prNumber) {
    console.error('Missing required environment variables');
    console.error('Required: GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY_NAME, PR_NUMBER');
    process.exit(1);
  }

  const resolver = new MergeConflictResolver();
  resolver.resolve(owner, repo, prNumber, baseBranch)
    .then(result => {
      console.log('Resolution complete:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Failed to resolve conflicts:', error);
      process.exit(1);
    });
}

module.exports = MergeConflictResolver;

// Made with Bob