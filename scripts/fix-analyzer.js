const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing consolidated-pr-analyzer.js...');

const filePath = path.join(__dirname, 'consolidated-pr-analyzer.js');
let content = fs.readFileSync(filePath, 'utf8');

// The orphaned code that needs to be moved (lines 680-704)
const orphanedCode = `          const identifierPattern = /\\b([A-Z][a-zA-Z0-9]*)\\b/g;
          let idMatch;
          while ((idMatch = identifierPattern.exec(arrayContent)) !== null) {
            const identifier = idMatch[1];
            // Skip common keywords and built-in types
            if (['Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Promise'].includes(identifier)) {
              continue;
            }
            // Check if identifier is imported
            if (!importedIdentifiers.has(identifier)) {
              // Find line number in content
              const lineNum = content.substring(0, arrayMatch.index).split('\\n').length;
              const codeLine = content.split('\\n')[lineNum - 1];
              missingImports.push({
                file: filePath,
                line: lineNum,
                identifier: identifier,
                context: context,
                code: codeLine?.trim()
              });
            }
          }
        }
      }
    }`;

// Remove the orphaned code from after determineImportPath function
content = content.replace(/  }\n          const identifierPattern[\s\S]*?        }\n      }\n    }\n    if \(missingImports\.length > 0\)/, '  }\n  \n    if (missingImports.length > 0)');

// Insert the code in the correct location (after line 514)
content = content.replace(
  /          const arrayContent = arrayMatch\[1\];\n          \/\/ Extract identifiers \(class names\)\n  \/\*\*/,
  `          const arrayContent = arrayMatch[1];
          // Extract identifiers (class names)
${orphanedCode}
    if (missingImports.length > 0) {
      // Search for correct import paths for each missing import
      const detailsWithCorrectPaths = [];
      for (const mi of missingImports) {
        console.log(\`\${colors.blue}🔍 Searching for \${mi.identifier}...\${colors.reset}\`);
        const definition = await this.findIdentifierDefinition(mi.identifier);
        let suggestion;
        let autoFixable = false;
        if (definition) {
          if (definition.isPackageImport) {
            suggestion = \`Add import statement: import { \${mi.identifier} } from '\${definition.importPath}';\`;
            autoFixable = true;
            console.log(\`\${colors.green}✅ Found in package: \${definition.packageName}\${colors.reset}\`);
          } else {
            // Calculate relative path from current file to definition
            const repoRoot = path.join(process.cwd(), '..');
            const currentFileAbsolute = path.join(repoRoot, mi.file);
            const currentFileDir = path.dirname(currentFileAbsolute);
            const definitionAbsolute = path.join(repoRoot, definition.filePath);
            const definitionPathNoExt = definitionAbsolute.replace(/\\.(ts|tsx|js|jsx)$/, '');
            let relativePath = path.relative(currentFileDir, definitionPathNoExt).replace(/\\\\/g, '/');
            // Ensure the path starts with ./ or ../
            if (!relativePath.startsWith('.')) {
              relativePath = './' + relativePath;
            }
            suggestion = \`Add import statement: import { \${mi.identifier} } from '\${relativePath}';\`;
            autoFixable = true;
            console.log(\`\${colors.green}✅ Found at: \${definition.filePath}\${colors.reset}\`);
            console.log(\`\${colors.blue}   Relative import: \${relativePath}\${colors.reset}\`);
          }
        } else {
          suggestion = \`Could not find '\${mi.identifier}' in repository. Please verify the class name and add the correct import manually.\`;
          console.log(\`\${colors.yellow}⚠️  Could not locate \${mi.identifier}\${colors.reset}\`);
        }
        detailsWithCorrectPaths.push({
          file: mi.file,
          line: mi.line,
          message: \`'\${mi.identifier}' used in \${mi.context} but not imported\`,
          suggestion: suggestion,
          code: mi.code,
          autoFixable: autoFixable,
          correctImportPath: definition?.importPath || null
        });
      }
      this.results.critical.push({
        type: 'missing-imports',
        title: \`Missing Imports Detected (\${missingImports.length})\`,
        message: 'Classes/Services referenced but not imported',
        details: detailsWithCorrectPaths,
        severity: 'critical',
        autoFixable: detailsWithCorrectPaths.some(d => d.autoFixable)
      });
      console.log(\`\${colors.red}❌ Found \${missingImports.length} missing imports\${colors.reset}\`);
    } else {
      this.results.passed.push('No missing imports detected');
      console.log(\`\${colors.green}✅ No missing imports\${colors.reset}\`);
    }
  }
  
  /**`
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ File fixed! Testing syntax...');

// Test the syntax
const { execSync } = require('child_process');
try {
  execSync('node -c consolidated-pr-analyzer.js', { cwd: __dirname, stdio: 'inherit' });
  console.log('✅ Syntax check passed!');
} catch (error) {
  console.log('❌ Syntax check failed. Manual fix still needed.');
  process.exit(1);
}


