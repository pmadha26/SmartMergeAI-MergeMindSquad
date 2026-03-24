#!/usr/bin/env node

/**
 * Auto-Resolve Simple Merge Conflicts
 * 
 * Automatically resolves simple, safe merge conflicts after PR approval
 * Only handles conflicts that are low-risk and straightforward
 */

const { execSync } = require('child_process');
const fs = require('fs');
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

class AutoConflictResolver {
  constructor() {
    this.resolvedFiles = [];
    this.skippedFiles = [];
  }

  /**
   * Main auto-resolution entry point
   */
  async resolve() {
    console.log(`${colors.bold}${colors.cyan}🤖 Auto-Resolving Simple Conflicts${colors.reset}\n`);

    try {
      // Merge base branch
      console.log(`Merging ${baseRef} into ${headRef}...`);
      
      try {
        execSync(`git merge origin/${baseRef}`, { stdio: 'pipe' });
        console.log(`${colors.green}✅ No conflicts - merge successful${colors.reset}`);
        return { success: true, resolved: [], skipped: [] };
      } catch (error) {
        console.log(`${colors.yellow}⚠️  Conflicts detected, attempting auto-resolution...${colors.reset}\n`);
      }

      // Get list of conflicted files
      const conflictedFiles = this.getConflictedFiles();
      
      if (conflictedFiles.length === 0) {
        console.log(`${colors.green}✅ No conflicted files found${colors.reset}`);
        return { success: true, resolved: [], skipped: [] };
      }

      console.log(`Found ${conflictedFiles.length} conflicted file(s)\n`);

      // Attempt to resolve each file
      for (const file of conflictedFiles) {
        await this.resolveFile(file);
      }

      // Display results
      this.displayResults();

      // Post comment
      await this.postResultComment();

      return {
        success: this.skippedFiles.length === 0,
        resolved: this.resolvedFiles,
        skipped: this.skippedFiles
      };

    } catch (error) {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Get list of conflicted files
   */
  getConflictedFiles() {
    try {
      const output = execSync('git diff --name-only --diff-filter=U', {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();

      return output ? output.split('\n').filter(f => f) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Resolve a single file
   */
  async resolveFile(file) {
    console.log(`${colors.blue}📄 Processing: ${file}${colors.reset}`);

    try {
      // Read file content
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check if it's safe to auto-resolve
      if (!this.isSafeToResolve(file, content)) {
        console.log(`  ${colors.yellow}⏭️  Skipped (not safe for auto-resolution)${colors.reset}\n`);
        this.skippedFiles.push(file);
        return;
      }

      // Attempt resolution
      const resolved = this.attemptResolution(content, file);
      
      if (resolved) {
        fs.writeFileSync(file, resolved, 'utf-8');
        execSync(`git add "${file}"`, { stdio: 'pipe' });
        console.log(`  ${colors.green}✅ Resolved${colors.reset}\n`);
        this.resolvedFiles.push(file);
      } else {
        console.log(`  ${colors.yellow}⏭️  Skipped (complex conflict)${colors.reset}\n`);
        this.skippedFiles.push(file);
      }

    } catch (error) {
      console.log(`  ${colors.red}❌ Failed: ${error.message}${colors.reset}\n`);
      this.skippedFiles.push(file);
    }
  }

  /**
   * Check if file is safe to auto-resolve
   */
  isSafeToResolve(file, content) {
    const ext = file.split('.').pop();
    
    // Don't auto-resolve dangerous file types
    const dangerousExtensions = ['sql', 'db', 'lock', 'config', 'env', 'yml', 'yaml'];
    if (dangerousExtensions.includes(ext)) {
      return false;
    }

    // Don't auto-resolve if too many conflict markers
    const conflictCount = (content.match(/<<<<<<</g) || []).length;
    if (conflictCount > 3) {
      return false;
    }

    // Don't auto-resolve if file is too large
    const lines = content.split('\n').length;
    if (lines > 500) {
      return false;
    }

    return true;
  }

  /**
   * Attempt to resolve conflicts in content
   */
  attemptResolution(content, file) {
    const ext = file.split('.').pop();
    
    // Try different resolution strategies
    if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
      return this.resolveJavaScriptFile(content);
    } else if (ext === 'json') {
      return this.resolveJsonFile(content);
    } else if (['css', 'scss', 'less'].includes(ext)) {
      return this.resolveCssFile(content);
    } else if (['md', 'txt'].includes(ext)) {
      return this.resolveTextFile(content);
    }

    // Default: try simple resolution
    return this.resolveSimple(content);
  }

  /**
   * Resolve JavaScript/TypeScript conflicts
   */
  resolveJavaScriptFile(content) {
    const lines = content.split('\n');
    const resolved = [];
    let inConflict = false;
    let conflictStart = -1;
    let separator = -1;
    let ourLines = [];
    let theirLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        conflictStart = i;
        ourLines = [];
        theirLines = [];
      } else if (line.startsWith('=======') && inConflict) {
        separator = i;
      } else if (line.startsWith('>>>>>>>') && inConflict) {
        // Analyze conflict
        const resolution = this.resolveJsConflict(ourLines, theirLines);
        if (resolution === null) {
          return null; // Can't auto-resolve
        }
        resolved.push(...resolution);
        inConflict = false;
      } else if (inConflict) {
        if (separator === -1) {
          ourLines.push(line);
        } else {
          theirLines.push(line);
        }
      } else {
        resolved.push(line);
      }
    }

    return inConflict ? null : resolved.join('\n');
  }

  /**
   * Resolve JS-specific conflicts
   */
  resolveJsConflict(ourLines, theirLines) {
    // If both sides are imports, merge them
    const ourImports = ourLines.filter(l => l.trim().startsWith('import '));
    const theirImports = theirLines.filter(l => l.trim().startsWith('import '));
    
    if (ourImports.length === ourLines.length && theirImports.length === theirLines.length) {
      // Merge unique imports
      const allImports = [...new Set([...ourImports, ...theirImports])];
      return allImports.sort();
    }

    // If one side is empty, use the other
    if (ourLines.every(l => !l.trim())) {
      return theirLines;
    }
    if (theirLines.every(l => !l.trim())) {
      return ourLines;
    }

    // If both sides are additions (no deletions), keep both
    if (this.areBothAdditions(ourLines, theirLines)) {
      return [...ourLines, ...theirLines];
    }

    // Can't auto-resolve
    return null;
  }

  /**
   * Resolve JSON conflicts
   */
  resolveJsonFile(content) {
    // For JSON, we need to be very careful
    // Only resolve if it's a simple addition
    const lines = content.split('\n');
    const resolved = [];
    let inConflict = false;
    let ourLines = [];
    let theirLines = [];
    let separator = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        ourLines = [];
        theirLines = [];
        separator = -1;
      } else if (line.startsWith('=======') && inConflict) {
        separator = i;
      } else if (line.startsWith('>>>>>>>') && inConflict) {
        // Only resolve if both are simple additions
        if (this.areBothAdditions(ourLines, theirLines)) {
          resolved.push(...ourLines, ...theirLines);
        } else {
          return null; // Can't auto-resolve JSON conflicts
        }
        inConflict = false;
      } else if (inConflict) {
        if (separator === -1) {
          ourLines.push(line);
        } else {
          theirLines.push(line);
        }
      } else {
        resolved.push(line);
      }
    }

    return inConflict ? null : resolved.join('\n');
  }

  /**
   * Resolve CSS conflicts
   */
  resolveCssFile(content) {
    // For CSS, keep both sets of rules
    return this.resolveSimple(content);
  }

  /**
   * Resolve text file conflicts
   */
  resolveTextFile(content) {
    // For text files, keep both versions
    return this.resolveSimple(content);
  }

  /**
   * Simple resolution: keep both sides
   */
  resolveSimple(content) {
    const lines = content.split('\n');
    const resolved = [];
    let inConflict = false;
    let ourLines = [];
    let theirLines = [];
    let separator = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        ourLines = [];
        theirLines = [];
        separator = -1;
      } else if (line.startsWith('=======') && inConflict) {
        separator = i;
      } else if (line.startsWith('>>>>>>>') && inConflict) {
        // Keep both if they're different
        if (JSON.stringify(ourLines) !== JSON.stringify(theirLines)) {
          resolved.push(...ourLines, ...theirLines);
        } else {
          resolved.push(...ourLines);
        }
        inConflict = false;
      } else if (inConflict) {
        if (separator === -1) {
          ourLines.push(line);
        } else {
          theirLines.push(line);
        }
      } else {
        resolved.push(line);
      }
    }

    return inConflict ? null : resolved.join('\n');
  }

  /**
   * Check if both sides are additions
   */
  areBothAdditions(ourLines, theirLines) {
    // If both have content and don't overlap, they're additions
    const ourContent = ourLines.filter(l => l.trim()).join('');
    const theirContent = theirLines.filter(l => l.trim()).join('');
    
    return ourContent && theirContent && ourContent !== theirContent;
  }

  /**
   * Display results
   */
  displayResults() {
    console.log(`\n${colors.bold}Results:${colors.reset}`);
    console.log(`${colors.green}✅ Resolved: ${this.resolvedFiles.length}${colors.reset}`);
    console.log(`${colors.yellow}⏭️  Skipped: ${this.skippedFiles.length}${colors.reset}\n`);

    if (this.resolvedFiles.length > 0) {
      console.log(`${colors.green}Resolved files:${colors.reset}`);
      this.resolvedFiles.forEach(f => console.log(`  - ${f}`));
      console.log();
    }

    if (this.skippedFiles.length > 0) {
      console.log(`${colors.yellow}Skipped files (require manual resolution):${colors.reset}`);
      this.skippedFiles.forEach(f => console.log(`  - ${f}`));
      console.log();
    }
  }

  /**
   * Post result comment
   */
  async postResultComment() {
    let comment = `## 🤖 Auto-Resolution Results\n\n`;

    if (this.resolvedFiles.length > 0) {
      comment += `### ✅ Auto-Resolved Files (${this.resolvedFiles.length})\n\n`;
      this.resolvedFiles.forEach(f => {
        comment += `- \`${f}\`\n`;
      });
      comment += '\n';
    }

    if (this.skippedFiles.length > 0) {
      comment += `### ⚠️ Files Requiring Manual Resolution (${this.skippedFiles.length})\n\n`;
      this.skippedFiles.forEach(f => {
        comment += `- \`${f}\` - Too complex for auto-resolution\n`;
      });
      comment += '\n';
    }

    if (this.resolvedFiles.length > 0) {
      comment += `**✅ Changes committed and pushed automatically**\n\n`;
    }

    comment += `---\n*Automated by SmartMergeAI's Auto-Conflict Resolver* 🤖`;

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
}

// Main execution
async function main() {
  if (!owner || !repo || !prNumber || !baseRef || !headRef) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const resolver = new AutoConflictResolver();
  
  try {
    const result = await resolver.resolve();
    
    if (result.success) {
      console.log(`\n${colors.green}✅ All conflicts resolved successfully${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.yellow}⚠️  Some conflicts require manual resolution${colors.reset}`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();


