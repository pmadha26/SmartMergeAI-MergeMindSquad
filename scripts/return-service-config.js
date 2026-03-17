/**
 * Return Service Configuration - Enhanced Version
 * Updated configuration with new features
 */

module.exports = {
    // Service configuration - DIFFERENT VALUES
    serviceName: 'IBMICCReturnService',
    version: '2.0.0',  // Changed to 2.0.0
    apiEndpoint: '/api/v2/returns',  // Different endpoint
    
    // Timeout settings - DIFFERENT VALUES
    timeout: 10000,  // Increased timeout
    retries: 5,  // More retries
    
    // Feature flags - ADDED NEW FEATURE
    features: {
        autoValidation: true,
        adjustmentProcessing: true,
        reasonTracking: true,
        regressionDetection: true  // NEW: Added feature
    },
    
    // Validation rules - DIFFERENT VALUES
    validation: {
        maxReturnDays: 60,  // Extended to 60 days
        requireReason: true,
        allowPartialReturns: true,
        enableBulkReturns: true  // NEW: Added feature
    }
};

// Made with Bob
