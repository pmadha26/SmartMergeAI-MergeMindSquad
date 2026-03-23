/**
 * Configuration for Bob across different platforms
 * Supports GitHub, GitHub Enterprise, and Bitbucket
 */

module.exports = {
  // Platform detection
  platform: process.env.PLATFORM || detectPlatform(),
  
  // GitHub configuration
  github: {
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    enterprise: process.env.GITHUB_ENTERPRISE === 'true',
    token: process.env.GITHUB_TOKEN
  },
    validation: {
    maxFileSize: 2000000,      
    allowedExtensions: ['.js', '.ts', '.json', ]
  },
  
  // GitHub Enterprise configuration (e.g., github.ibm.com)
  githubEnterprise: {
    baseUrl: process.env.GITHUB_ENTERPRISE_URL || 'https://github.ibm.com/api/v3',
    token: process.env.GITHUB_ENTERPRISE_TOKEN || process.env.GITHUB_TOKEN,
    sslVerify: process.env.SSL_VERIFY !== 'false'
  },
  
  // Bitbucket configuration
  bitbucket: {
    baseUrl: process.env.BITBUCKET_API_URL || 'https://api.bitbucket.org/2.0',
    workspace: process.env.BITBUCKET_WORKSPACE,
    repoSlug: process.env.BITBUCKET_REPO_SLUG,
    username: process.env.BITBUCKET_USERNAME,
    appPassword: process.env.BITBUCKET_APP_PASSWORD
  },
  
  // Proxy configuration (for corporate environments)
  proxy: {
    http: process.env.HTTP_PROXY,
    https: process.env.HTTPS_PROXY,
    noProxy: process.env.NO_PROXY
  },
  
  // Feature flags
  features: {
    behaviorAnalysis: process.env.ENABLE_BEHAVIOR_ANALYSIS !== 'false',
    regressionDetection: process.env.ENABLE_REGRESSION_DETECTION !== 'false',
    autoFix: true,              // Enable auto-fix
    removeDebug: false,         // Remove debug statements
    fixTypos: true,             // Auto-fix typos
    fixMissingCommas: true,     // Auto-fix missing commas
    fixSyntaxErrors: false      // Auto-fix basic syntax errors (DISABLED - too aggressive)
  },
  
  // Typo dictionary for auto-fix (can be extended)
  typoDictionary: {
    'SERIVCE': 'SERVICE',
    'RETUNR': 'RETURN',
    'RECIEVE': 'RECEIVE',
    'SEPERATE': 'SEPARATE',
    'OCCURED': 'OCCURRED',
    'DEFINATELY': 'DEFINITELY',
    'ACCOMODATE': 'ACCOMMODATE',
    'recieve': 'receive',
    'seperate': 'separate',
    'occured': 'occurred',
    'definately': 'definitely',
    'accomodate': 'accommodate'
  }
};

function detectPlatform() {
  if (process.env.GITHUB_ACTIONS === 'true') {
    return process.env.GITHUB_ENTERPRISE === 'true' ? 'github-enterprise' : 'github';
  }
  if (process.env.BITBUCKET_PIPELINE_UUID) {
    return 'bitbucket';
  }
  return 'github'; // default
}

// Made with Bob
