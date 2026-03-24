# SmartMergeAI-MergeMindSquad 🤖

**AI That Safeguards Your Codebase**

An intelligent automation bot that performs comprehensive quality checks automatically whenever a developer opens or updates a pull request. Beyond standard checks like merge conflicts, it analyzes whether new changes unintentionally alter existing behavior, detects regressions, and identifies potential issues before they reach production.

Bob posts detailed, developer-friendly reviews directly inside PRs, highlighting regressions, behavior-impacting changes, API breaks, and risky modifications. After reviewer approval, Bob can automatically fix safe issues such as formatting, minor conflicts, typos, and missing imports—speeding up delivery without compromising control.

---

## 🌟 Key Features

### 🎯 Automated PR Analysis
- **Instant Activation**: Triggers automatically when PRs are created or updated
- **Non-Blocking**: Runs asynchronously without interrupting developer workflow
- **Real-Time Updates**: Posts status comments and updates as checks complete
- **Single Consolidated Report**: All findings in one comprehensive comment (no spam!)

### 🔍 Comprehensive Code Quality Checks

#### Missing Reference Detection
- Scans for missing imports and undefined types
- Detects orphaned references (imports pointing to non-existent files)
- Identifies missing configuration files and documentation
- **Intelligent Path Resolution**: Suggests correct import paths based on project structure

#### Bug Pattern Detection
- Null/undefined reference checks
- Unused variables and imports
- Unreachable code detection
- Hardcoded credentials and sensitive data exposure
- Translation issues (hardcoded strings that should be i18n)

#### Typo Detection & Auto-Fix
- Detects common typos in code and comments
- Auto-fixes typos like `SERIVCE` → `SERVICE`, `recieve` → `receive`
- Customizable typo dictionary
- Preserves code formatting and context

### 🔄 Behavior & Regression Analysis
- **Behavior Change Detection**: Identifies when changes alter existing functionality
- **Regression Detection**: Catches potential bugs introduced by new code
- **Breaking Changes Validation**: Flags API changes that could break consumers
- **Impact Analysis**: Assesses the scope and risk of changes

### 🛠️ Auto-Fix Capabilities
After reviewer approval, Bob can automatically fix:
- ✅ Missing imports (with intelligent path resolution)
- ✅ Simple typos and formatting issues
- ✅ Missing commas and basic syntax errors
- ✅ Unused imports and variables
- ✅ Minor merge conflicts

### 🚦 Merge Protection
- Blocks merges when critical issues are detected
- Sets commit status checks (pass/fail)
- Provides clear remediation steps
- Re-validates after fixes are pushed

### 📊 Intelligent Reporting
Generates structured reports with:
- **Summary Dashboard**: Critical issues, warnings, passed checks
- **Severity Levels**: Critical, High, Medium, Low
- **File Locations**: Exact line numbers and context
- **Fix Suggestions**: Actionable recommendations
- **Auto-Fix Indicators**: Shows which issues can be auto-fixed

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- GitHub, GitHub Enterprise, or Bitbucket account
- Repository access with appropriate permissions

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR-ORG/SmartMergeAI-MergeMindSquad.git
cd SmartMergeAI-MergeMindSquad/scripts
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `scripts` directory:

```bash
# Platform Configuration (auto-detected if not set)
PLATFORM=github  # Options: github, github-enterprise, bitbucket

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_API_URL=https://api.github.com

# GitHub Enterprise Configuration (if applicable)
GITHUB_ENTERPRISE=true
GITHUB_ENTERPRISE_URL=https://github.ibm.com/api/v3
GITHUB_ENTERPRISE_TOKEN=your_enterprise_token

# Bitbucket Configuration (if applicable)
BITBUCKET_WORKSPACE=your_workspace
BITBUCKET_REPO_SLUG=your_repo
BITBUCKET_USERNAME=your_username
BITBUCKET_APP_PASSWORD=your_app_password

# Proxy Configuration (for corporate environments)
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8080

# Feature Flags
ENABLE_BEHAVIOR_ANALYSIS=true
ENABLE_REGRESSION_DETECTION=true
```

4. **Set up GitHub Actions workflow**

Create `.github/workflows/bob-pr-validation.yml`:

```yaml
name: Bob PR Validation

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: |
          cd scripts
          npm install
      
      - name: Run Bob Validation
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd scripts
          npm run behavior-analysis
          npm run regression-detection
          npm run validate-description
```

---

## 📖 Usage

### Running Individual Checks

```bash
cd scripts

# Check PR size
npm run size-check

# Assign reviewers automatically
npm run assign-reviewers

# Validate PR description
npm run validate-description

# Analyze behavior changes
npm run behavior-analysis

# Detect regressions
npm run regression-detection

# Auto-fix issues (after approval)
npm run auto-fix

# Validate specific commit
npm run validate-commit

# Resolve merge conflicts
npm run resolve-conflicts
```

### Running Comprehensive Validation

```bash
# Run all validators
npm run size-check && \
npm run validate-description && \
npm run behavior-analysis && \
npm run regression-detection
```

---

## ⚙️ Configuration

### Feature Flags

Edit [`scripts/config.js`](scripts/config.js:1) to customize behavior:

```javascript
features: {
  behaviorAnalysis: true,        // Detect behavior changes
  regressionDetection: true,     // Catch regressions
  autoFix: true,                 // Enable auto-fix
  removeDebug: false,            // Remove debug statements
  fixTypos: true,                // Auto-fix typos
  fixMissingCommas: true,        // Auto-fix missing commas
  fixSyntaxErrors: false         // Auto-fix syntax (use cautiously)
}
```

### Typo Dictionary

Extend the typo dictionary in [`config.js`](scripts/config.js:56):

```javascript
typoDictionary: {
  'SERIVCE': 'SERVICE',
  'RETUNR': 'RETURN',
  'recieve': 'receive',
  // Add your custom typos here
}
```

### Validation Rules

Customize validation thresholds:

```javascript
validation: {
  maxFileSize: 2000000,          // 2MB max file size
  allowedExtensions: ['.js', '.ts', '.json']
}
```

---

## 🎯 Example Output

### Bob's PR Comment

```markdown
## 🔍 Bob's Comprehensive PR Analysis

### 🚫 Status: MERGE BLOCKED

### 📊 Summary
- Total Issues: 15
- Critical: 3
- High: 5
- Medium: 7
- Auto-fixable: 9

---

### 📦 Missing Imports (6 issues)

#### ❌ Critical: Missing import for `TestComponent`
**File**: `app-customization.impl.ts:45`
**Suggestion**: Add `import { TestComponent } from './components/test.component';`
**Auto-fix**: ✅ Available

#### ❌ Critical: Missing import for `Observable`
**File**: `app-customization.impl.ts:67`
**Suggestion**: Add `import { Observable } from 'rxjs';`
**Auto-fix**: ✅ Available

---

### 🔤 Typos Detected (6 issues)

#### ⚠️ Medium: Typo in constant name
**File**: `app-customization.impl.ts:23`
**Found**: `SERIVCE`
**Should be**: `SERVICE`
**Auto-fix**: ✅ Available

---

### 🔗 Undefined Types (2 issues)

#### ⚠️ High: Undefined type `CustomReturnType`
**File**: `app-customization.impl.ts:89`
**Suggestion**: Define the type or import from appropriate module
**Auto-fix**: ❌ Manual fix required

---

### 🌍 Translation Issues (2 issues)

#### ⚠️ Medium: Hardcoded string detected
**File**: `app-customization.impl.ts:112`
**Found**: `'Welcome to our application'`
**Suggestion**: Use i18n translation key
**Auto-fix**: ❌ Manual fix required

---

### 🛠️ Recommended Actions

1. **Auto-fix available issues** (9 issues)
   - Run: `npm run auto-fix` after reviewer approval
   
2. **Manual fixes required** (6 issues)
   - Define missing types
   - Create missing files
   - Add translation keys

3. **Re-run validation**
   - Push fixes to trigger re-validation
   - Bob will update this comment automatically

---

**⏱️ Analysis completed in 2.3 seconds**
```

---

## 🏗️ Architecture

### Core Components

```
SmartMergeAI-MergeMindSquad/
├── scripts/
│   ├── config.js                          # Platform & feature configuration
│   ├── consolidated-pr-analyzer.js        # Main analysis orchestrator
│   ├── pr-behavior-analyzer.js            # Behavior change detection
│   ├── pr-regression-detector.js          # Regression analysis
│   ├── pr-auto-fixer.js                   # Auto-fix engine
│   ├── missing-reference-detector.js      # Import & type validation
│   ├── auto-merge-conflict-resolver.js    # Conflict resolution
│   ├── pr-breaking-changes-validator.js   # API compatibility checks
│   └── bitbucket-adapter.js               # Multi-platform support
└── .github/workflows/
    └── bob-pr-validation.yml              # CI/CD integration
```

### Validation Pipeline

1. **PR Trigger** → Webhook/Action triggered
2. **File Analysis** → Scan changed files
3. **Multi-Validator Run** → Parallel validation checks
4. **Report Generation** → Consolidate findings
5. **Comment Posting** → Single comprehensive report
6. **Status Check** → Pass/Fail commit status
7. **Auto-Fix** (if approved) → Apply safe fixes
8. **Re-validation** → Verify fixes

---

## 🎬 Demo & Testing

See [`DEMO_PR_GUIDE.md`](DEMO_PR_GUIDE.md:1) for a comprehensive guide to creating a demo PR that tests all features.

### Quick Demo

```bash
# Create demo branch with test cases
git checkout -b demo/validation-test

# Modify test file (already prepared)
git add call-center-return/packages/return-search/src-custom/app/app-customization.impl.ts

# Commit and push
git commit -m "test: Add validation test cases"
git push origin demo/validation-test

# Create PR and watch Bob in action!
gh pr create --title "🎬 DEMO: SmartMergeAI Validation" --base main
```

---

## 🔧 Troubleshooting

### Workflow Not Triggering
```bash
# Check workflow file exists
ls -la .github/workflows/

# Manually trigger
gh workflow run bob-pr-validation.yml
```

### Bob Not Commenting
1. Verify bot has `pull-requests: write` permission
2. Check GitHub Actions logs for errors
3. Ensure `GITHUB_TOKEN` is properly configured

### Issues Not Detected
1. Check file paths in validator configuration
2. Verify changed files are being scanned
3. Review validator logs in Actions tab

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request (Bob will review it! 😉)

---

## 📄 License

This project is licensed under the IBM License - see the [`license`](call-center-return/license/) directory for details.

---

## 🙏 Acknowledgments

- Built with ❤️ by the IBM Development Team
- Powered by [@octokit/rest](https://github.com/octokit/rest.js) for GitHub API integration
- Supports GitHub, GitHub Enterprise, and Bitbucket platforms

---

## 📚 Additional Documentation

- **Demo Script**: [`docs/DEMO_SCRIPT_4MIN.md`](docs/DEMO_SCRIPT_4MIN.md:1)
- **Demo Notes**: [`docs/DEMO_NOTES.md`](docs/DEMO_NOTES.md:1)
- **Intelligent Import Fix**: [`docs/INTELLIGENT_IMPORT_FIX.md`](docs/INTELLIGENT_IMPORT_FIX.md:1)
- **Workflow Analysis**: [`docs/WORKFLOW_ANALYSIS.md`](docs/WORKFLOW_ANALYSIS.md:1)

---



**🤖 SmartMergeAI - Making Code Reviews Smarter, Faster, and Safer**

*Last Updated: March 2026*
