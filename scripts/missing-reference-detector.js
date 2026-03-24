#!/usr/bin/env node

/**
 * Missing Reference Detector
 * 
 * Detects when code references files/resources that don't exist in:
 * - The current PR
 * - The repository
 * 
 * Checks for:
 * - Import/require statements
 * - Translation keys (i18n)
 * - Asset references (images, fonts, etc.)
 * - Configuration files
 * - Template references
 * - Any file path references
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class MissingReferenceDetector {
  constructor(options = {}) {
    this.baseRef = options.base || process.env.BASE_REF || 'origin/main';
    this.headRef = options.head || process.env.HEAD_REF || 'HEAD';
    this.workingDir = options.cwd || process.cwd();
    
    this.missingReferences = [];
    this.changedFiles = [];
  }

  /**
   * Main detection entry point
   */
  async detect() {
    console.log(`${colors.bold}${colors.cyan}🔍 Missing Reference Detector${colors.reset}\n`);
    
    try {
      // Get changed files
      this.getChangedFiles();
      
      // Detect missing references
      await this.detectMissingImports();
      await this.detectMissingTranslations();
      await this.detectMissingAssets();
      await this.detectMissingConfigs();
      await this.detectMissingTemplates();
      
      // Report results
      this.displayResults();
      
      // Exit with appropriate code
      if (this.missingReferences.length > 0) {
        console.log(`\n${colors.red}❌ Missing references detected!${colors.reset}`);
        process.exit(1);
      } else {
        console.log(`\n${colors.green}✅ No missing references detected${colors.reset}`);
        process.exit(0);
      }
    } catch (error) {
      console.error(`${colors.red}❌ Detection failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  /**
   * Get changed files in PR
   */
  getChangedFiles() {
    try {
      const output = execSync(
        `git diff --name-only ${this.baseRef}...${this.headRef}`,
        { encoding: 'utf-8', cwd: this.workingDir }
      );
      
      this.changedFiles = output.trim().split('\n').filter(f => f);
      console.log(`${colors.cyan}📁 Analyzing ${this.changedFiles.length} changed files${colors.reset}\n`);
    } catch (error) {
      console.error('Error getting changed files:', error.message);
      throw error;
    }
  }

  /**
   * Detect missing import/require statements
   */
  async detectMissingImports() {
    console.log(`${colors.cyan}🔗 Checking imports and requires...${colors.reset}`);
    
    const codeFiles = this.changedFiles.filter(f => 
      /\.(ts|js|tsx|jsx)$/.test(f) && fs.existsSync(path.join(this.workingDir, f))
    );
    
    for (const file of codeFiles) {
      const filePath = path.join(this.workingDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match import statements
      const importPatterns = [
        /import\s+.*\s+from\s+['"](.+?)['"]/g,
        /require\s*\(\s*['"](.+?)['"]\s*\)/g,
        /import\s*\(\s*['"](.+?)['"]\s*\)/g
      ];
      
      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          
          // Skip node_modules and external packages
          if (importPath.startsWith('.') || importPath.startsWith('/')) {
            const resolvedPath = this.resolveImportPath(file, importPath);
            
            if (resolvedPath && !this.fileExists(resolvedPath)) {
              this.missingReferences.push({
                type: 'missing-import',
                severity: 'critical',
                file: file,
                reference: importPath,
                resolvedPath: resolvedPath,
                message: `Import '${importPath}' references missing file`,
                suggestion: 'Add the missing file to your PR or fix the import path'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Detect missing translation keys
   */
  async detectMissingTranslations() {
    console.log(`${colors.cyan}🌐 Checking translation references...${colors.reset}`);
    
    const templateFiles = this.changedFiles.filter(f => 
      /\.(html|ts|tsx|jsx)$/.test(f) && fs.existsSync(path.join(this.workingDir, f))
    );
    
    for (const file of templateFiles) {
      const filePath = path.join(this.workingDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match translation keys
      const translationPatterns = [
        /['"]([A-Z_]+\.[A-Z_]+(?:\.[A-Z_]+)*)['"]\s*\|\s*translate/g,
        /translate\s*\(\s*['"]([A-Z_]+\.[A-Z_]+(?:\.[A-Z_]+)*)['"]/g,
        /\$t\s*\(\s*['"]([A-Z_]+\.[A-Z_]+(?:\.[A-Z_]+)*)['"]/g
      ];
      
      for (const pattern of translationPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const translationKey = match[1];
          
          // Find i18n files
          const i18nFiles = this.findI18nFiles();
          let keyFound = false;
          
          for (const i18nFile of i18nFiles) {
            if (this.translationKeyExists(i18nFile, translationKey)) {
              keyFound = true;
              break;
            }
          }
          
          if (!keyFound) {
            this.missingReferences.push({
              type: 'missing-translation',
              severity: 'high',
              file: file,
              reference: translationKey,
              message: `Translation key '${translationKey}' not found in any i18n file`,
              suggestion: `Add '${translationKey}' to appropriate i18n files (e.g., en.json)`
            });
          }
        }
      }
    }
  }

  /**
   * Detect missing asset references
   */
  async detectMissingAssets() {
    console.log(`${colors.cyan}🖼️  Checking asset references...${colors.reset}`);
    
    const assetReferenceFiles = this.changedFiles.filter(f => 
      /\.(ts|js|tsx|jsx|html|css|scss)$/.test(f) && fs.existsSync(path.join(this.workingDir, f))
    );
    
    for (const file of assetReferenceFiles) {
      const filePath = path.join(this.workingDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match asset paths
      const assetPatterns = [
        /['"]([./]+assets\/[^'"]+)['"]/g,
        /url\s*\(\s*['"]?([./]+assets\/[^'"]+)['"]?\s*\)/g,
        /src\s*=\s*['"]([./]+assets\/[^'"]+)['"]/g
      ];
      
      for (const pattern of assetPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const assetPath = match[1];
          const resolvedPath = this.resolveAssetPath(file, assetPath);
          
          if (resolvedPath && !this.fileExists(resolvedPath)) {
            this.missingReferences.push({
              type: 'missing-asset',
              severity: 'medium',
              file: file,
              reference: assetPath,
              resolvedPath: resolvedPath,
              message: `Asset '${assetPath}' not found`,
              suggestion: 'Add the missing asset file to your PR'
            });
          }
        }
      }
    }
  }

  /**
   * Detect missing configuration files
   */
  async detectMissingConfigs() {
    console.log(`${colors.cyan}⚙️  Checking configuration references...${colors.reset}`);
    
    const configPatterns = [
      /require\s*\(\s*['"]([^'"]*\.json)['"]\s*\)/g,
      /import\s+.*\s+from\s+['"]([^'"]*\.json)['"]/g,
      /['"]([^'"]*config[^'"]*\.json)['"]/g
    ];
    
    const codeFiles = this.changedFiles.filter(f => 
      /\.(ts|js|tsx|jsx)$/.test(f) && fs.existsSync(path.join(this.workingDir, f))
    );
    
    for (const file of codeFiles) {
      const filePath = path.join(this.workingDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of configPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const configPath = match[1];
          
          if (configPath.startsWith('.') || configPath.startsWith('/')) {
            const resolvedPath = this.resolveImportPath(file, configPath);
            
            if (resolvedPath && !this.fileExists(resolvedPath)) {
              this.missingReferences.push({
                type: 'missing-config',
                severity: 'high',
                file: file,
                reference: configPath,
                resolvedPath: resolvedPath,
                message: `Configuration file '${configPath}' not found`,
                suggestion: 'Add the missing configuration file to your PR'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Detect missing template references
   */
  async detectMissingTemplates() {
    console.log(`${colors.cyan}📄 Checking template references...${colors.reset}`);
    
    const componentFiles = this.changedFiles.filter(f => 
      /\.component\.(ts|js)$/.test(f) && fs.existsSync(path.join(this.workingDir, f))
    );
    
    for (const file of componentFiles) {
      const filePath = path.join(this.workingDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Match templateUrl
      const templateMatch = content.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/);
      if (templateMatch) {
        const templatePath = templateMatch[1];
        const resolvedPath = this.resolveImportPath(file, templatePath);
        
        if (resolvedPath && !this.fileExists(resolvedPath)) {
          this.missingReferences.push({
            type: 'missing-template',
            severity: 'critical',
            file: file,
            reference: templatePath,
            resolvedPath: resolvedPath,
            message: `Template file '${templatePath}' not found`,
            suggestion: 'Add the missing template file to your PR'
          });
        }
      }
      
      // Match styleUrls
      const styleMatch = content.match(/styleUrls\s*:\s*\[([\s\S]*?)\]/);
      if (styleMatch) {
        const styleUrls = styleMatch[1].match(/['"]([^'"]+)['"]/g);
        if (styleUrls) {
          styleUrls.forEach(url => {
            const stylePath = url.replace(/['"]/g, '');
            const resolvedPath = this.resolveImportPath(file, stylePath);
            
            if (resolvedPath && !this.fileExists(resolvedPath)) {
              this.missingReferences.push({
                type: 'missing-style',
                severity: 'medium',
                file: file,
                reference: stylePath,
                resolvedPath: resolvedPath,
                message: `Style file '${stylePath}' not found`,
                suggestion: 'Add the missing style file to your PR'
              });
            }
          });
        }
      }
    }
  }

  /**
   * Resolve import path to absolute path
   */
  resolveImportPath(fromFile, importPath) {
    try {
      const fromDir = path.dirname(path.join(this.workingDir, fromFile));
      let resolved = path.resolve(fromDir, importPath);
      
      // Try with common extensions
      const extensions = ['', '.ts', '.js', '.tsx', '.jsx', '.json'];
      for (const ext of extensions) {
        const testPath = resolved + ext;
        if (fs.existsSync(testPath)) {
          return path.relative(this.workingDir, testPath);
        }
      }
      
      // Try index files
      for (const ext of ['.ts', '.js']) {
        const indexPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return path.relative(this.workingDir, indexPath);
        }
      }
      
      return path.relative(this.workingDir, resolved);
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve asset path
   */
  resolveAssetPath(fromFile, assetPath) {
    try {
      const fromDir = path.dirname(path.join(this.workingDir, fromFile));
      const resolved = path.resolve(fromDir, assetPath);
      return path.relative(this.workingDir, resolved);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if file exists in repository or PR
   */
  fileExists(filePath) {
    const fullPath = path.join(this.workingDir, filePath);
    
    // Check if file exists in working directory
    if (fs.existsSync(fullPath)) {
      return true;
    }
    
    // Check if file is in the PR (changed files)
    if (this.changedFiles.includes(filePath)) {
      return true;
    }
    
    // Check if file exists in base branch
    try {
      execSync(`git cat-file -e ${this.baseRef}:${filePath}`, {
        cwd: this.workingDir,
        stdio: 'ignore'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Find all i18n files
   */
  findI18nFiles() {
    const i18nFiles = [];
    
    try {
      const output = execSync(
        `find . -path "*/i18n/*.json" -o -path "*/assets/**/i18n/*.json"`,
        { encoding: 'utf-8', cwd: this.workingDir, stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      output.trim().split('\n').forEach(file => {
        if (file && fs.existsSync(path.join(this.workingDir, file))) {
          i18nFiles.push(file.replace(/^\.\//, ''));
        }
      });
    } catch (error) {
      // Fallback: search common locations
      const commonPaths = [
        'src/assets/i18n',
        'assets/i18n',
        'src-custom/assets/i18n'
      ];
      
      commonPaths.forEach(dir => {
        const fullPath = path.join(this.workingDir, dir);
        if (fs.existsSync(fullPath)) {
          const files = fs.readdirSync(fullPath);
          files.forEach(file => {
            if (file.endsWith('.json')) {
              i18nFiles.push(path.join(dir, file));
            }
          });
        }
      });
    }
    
    return i18nFiles;
  }

  /**
   * Check if translation key exists in i18n file
   */
  translationKeyExists(i18nFile, key) {
    try {
      const filePath = path.join(this.workingDir, i18nFile);
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);
      
      // Navigate nested keys (e.g., "RETURN_SERVICE.EXTN_ORDER_KEY")
      const keys = key.split('.');
      let current = translations;
      
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}${colors.cyan}📊 Missing Reference Detection Results${colors.reset}`);
    console.log('='.repeat(80) + '\n');
    
    if (this.missingReferences.length === 0) {
      console.log(`${colors.green}✅ No missing references found!${colors.reset}\n`);
      return;
    }
    
    // Group by severity
    const critical = this.missingReferences.filter(r => r.severity === 'critical');
    const high = this.missingReferences.filter(r => r.severity === 'high');
    const medium = this.missingReferences.filter(r => r.severity === 'medium');
    
    if (critical.length > 0) {
      console.log(`${colors.bold}${colors.red}🔴 Critical Issues (${critical.length}):${colors.reset}\n`);
      critical.forEach((ref, i) => {
        console.log(`${i + 1}. ${ref.type}`);
        console.log(`   File: ${colors.yellow}${ref.file}${colors.reset}`);
        console.log(`   Reference: ${colors.red}${ref.reference}${colors.reset}`);
        console.log(`   ${ref.message}`);
        console.log(`   💡 ${ref.suggestion}\n`);
      });
    }
    
    if (high.length > 0) {
      console.log(`${colors.bold}${colors.yellow}🟠 High Priority (${high.length}):${colors.reset}\n`);
      high.forEach((ref, i) => {
        console.log(`${i + 1}. ${ref.type}`);
        console.log(`   File: ${colors.yellow}${ref.file}${colors.reset}`);
        console.log(`   Reference: ${ref.reference}`);
        console.log(`   ${ref.message}\n`);
      });
    }
    
    if (medium.length > 0) {
      console.log(`${colors.bold}🟡 Medium Priority (${medium.length}):${colors.reset}\n`);
      medium.forEach((ref, i) => {
        console.log(`${i + 1}. ${ref.type} in ${ref.file}`);
      });
      console.log();
    }
    
    console.log('='.repeat(80));
    console.log(`${colors.bold}Total: ${this.missingReferences.length} missing reference(s)${colors.reset}`);
    console.log('='.repeat(80) + '\n');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    const cleanKey = key.replace(/^--/, '');
    options[cleanKey] = value;
  });
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const detector = new MissingReferenceDetector(options);
  
  detector.detect().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = MissingReferenceDetector;

