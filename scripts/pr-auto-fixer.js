#!/usr/bin/env node
/**
 * PR Auto-Fixer Bot
 * Automatically fixes safe issues like formatting, minor conflicts, and missing files
 * Only runs after reviewer approval
 */
const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
// Import the intelligent import analyzer class
const { ConsolidatedAnalyzer } = require('./consolidated-pr-analyzer');
const path = require('path');
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY_NAME;
const prNumber = parseInt(process.env.PR_NUMBER);
// Auto-fix patterns
const AUTO_FIX_PATTERNS = {
  common: {
    trailingWhitespace: /[ \t]+$/gm,
    multipleBlankLines: /\n{3,}/g,
    debugStatements: /console\.(log|debug|info)\([^)]*\);?\n?/g
  },
  typescript: {
    unusedImports: /import\s+{\s*\w+\s*}\s+from\s+['"][^'"]+['"];?\s*\n/g
  }
};
/**
 * Check if PR is approved
 */
async function checkIfApproved(owner, repo, prNumber) {
  try {
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber
    });
    return reviews.some(review => review.state === 'APPROVED');
  } catch (error) {
    console.error('Error checking approval status:', error.message);
    return false;
  }
}
/**
 * Auto-fix formatting issues
 */
function fixFormatting(content, filePath) {
  const fixes = [];
  let fixed = content;
  // Remove trailing whitespace
  const beforeWhitespace = fixed;
  fixed = fixed.replace(AUTO_FIX_PATTERNS.common.trailingWhitespace, '');
  if (fixed !== beforeWhitespace) {
    fixes.push('Removed trailing whitespace');
  }
  // Reduce multiple blank lines to maximum 2
  const beforeBlankLines = fixed;
  fixed = fixed.replace(AUTO_FIX_PATTERNS.common.multipleBlankLines, '\n\n');
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
/**
 * Auto-fix missing imports using intelligent analyzer
 * Uses ConsolidatedAnalyzer to detect correct import paths
 */
async function fixMissingImports(content, filePath) {
  const fixes = [];
  let fixed = content;
  
  try {
    // Create analyzer instance to use its helper methods
    const analyzer = new ConsolidatedAnalyzer();
    
    // Extract all imported identifiers from current file
    const importedIdentifiers = new Set();
    const importPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from/g;
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      if (match[1]) {
        // Named imports
        match[1].split(',').forEach(name => {
          importedIdentifiers.add(name.trim().split(/\s+as\s+/)[0]);
        });
      } else if (match[2]) {
        // Default import
        importedIdentifiers.add(match[2]);
      }
    }
    
    // Check for class/service references in providers, components arrays
    const referencePatterns = [
      { pattern: /components\s*[:=]\s*\[([^\]]+)\]/gs, context: 'components' },
      { pattern: /providers\s*[:=]\s*\[([^\]]+)\]/gs, context: 'providers' },
      { pattern: /declarations\s*[:=]\s*\[([^\]]+)\]/gs, context: 'declarations' }
    ];
    
    const importsToAdd = new Map(); // identifier -> import path
    
    for (const { pattern, context } of referencePatterns) {
      let arrayMatch;
      while ((arrayMatch = pattern.exec(content)) !== null) {
        const arrayContent = arrayMatch[1];
        const identifierPattern = /\b([A-Z][a-zA-Z0-9]*)\b/g;
        let idMatch;
        
        while ((idMatch = identifierPattern.exec(arrayContent)) !== null) {
          const identifier = idMatch[1];
          
          // Skip built-in types
          if (['Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Promise'].includes(identifier)) {
            continue;
          }
          
          // Check if not imported
          if (!importedIdentifiers.has(identifier)) {
            console.log(`🔍 Found missing import: ${identifier}`);
            
            // Use the analyzer's intelligent search
            const definition = await analyzer.findIdentifierDefinition(identifier);
            
            if (definition && definition.importPath) {
              console.log(`✅ Found definition for ${identifier}: ${definition.importPath}`);
              importsToAdd.set(identifier, definition.importPath);
            } else {
              console.log(`⚠️  Could not find definition for ${identifier}`);
            }
          }
        }
      }
    }
    
    // Add missing imports at the top of the file (after existing imports)
    if (importsToAdd.size > 0) {
      const lines = fixed.split('\n');
      let lastImportIndex = -1;
      
      // Find the last import statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      // Insert new imports after the last import
      const newImports = [];
      for (const [identifier, importPath] of importsToAdd.entries()) {
        newImports.push(`import { ${identifier} } from '${importPath}';`);
        fixes.push(`Added missing import for ${identifier} from ${importPath}`);
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, ...newImports);
        fixed = lines.join('\n');
      } else {
        // No imports found, add at the beginning
        fixed = newImports.join('\n') + '\n\n' + fixed;
      }
    }
  } catch (error) {
    console.log(`⚠️  Error in intelligent import fixing: ${error.message}`);
    console.log(error.stack);
    console.log('   Skipping import fixes for this file');
  }
  
  return { fixed, fixes };
}
async function autoFixPR(owner, repo, prNumber) {
  try {
    console.log(`Starting auto-fix for PR #${prNumber}...`);
    // Check if PR is approved
    const isApproved = await checkIfApproved(owner, repo, prNumber);
    if (!isApproved) {
      console.log('PR is not approved yet. Skipping auto-fix.');
      return;
    }
    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    // Get list of files in the PR
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
        // Fix missing imports for TypeScript/JavaScript files
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          const importResult = await fixMissingImports(fixed, file.filename);
          fixed = importResult.fixed;
          fixes = [...fixes, ...importResult.fixes];
        }
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
          fixedFiles.push(file.filename);
          allFixes.push(...fixes.map(fix => `${file.filename}: ${fix}`));
          console.log(`✅ Fixed ${file.filename}: ${fixes.join(', ')}`);
        }
      } catch (error) {
        console.error(`Error processing ${file.filename}:`, error.message);
      }
    }
    // Post summary comment
    if (fixedFiles.length > 0) {
      const comment = `## 🤖 Auto-Fix Applied

I've automatically fixed the following issues:

${allFixes.map(fix => `- ${fix}`).join('\n')}

**Files modified:** ${fixedFiles.length}
${fixedFiles.map(f => `- \`${f}\``).join('\n')}

// Made with Bob`;
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: comment
      });
      console.log(`✅ Auto-fix complete! Fixed ${fixedFiles.length} files.`);
    } else {
      console.log('No auto-fixable issues found.');
    }
  } catch (error) {
    console.error('Auto-fix failed:', error.message);
    throw error;
  }
}
// Main execution
if (require.main === module) {
  autoFixPR(owner, repo, prNumber)
    .then(() => {
      console.log('Auto-fix completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Auto-fix failed:', error);
      process.exit(1);
    });
}
module.exports = { autoFixPR, fixFormatting, fixMissingImports, removeDebugStatements };
