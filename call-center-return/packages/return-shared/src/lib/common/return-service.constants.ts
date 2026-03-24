/**
feature/ibm-icc-return-service-integration

 * Return Service Constants - Base Version
 main
 */

export const RETURN_SERVICE_CONFIG = {
    SERVICE_NAME: 'IBMICCReturnService',
    API_VERSION: 'v2',  // Changed to v2
    BASE_PATH: '/api/v2/returns',  // Different path
    TIMEOUT: 10000  // Increased timeout
};

export const RETURN_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    IN_PROGRESS: 'IN_PROGRESS',  // NEW: Added status
    COMPLETED: 'COMPLETED'  // NEW: Added status
};

export const VALIDATION_RULES = {
    MAX_RETURN_DAYS: 60,  // Extended days
    MIN_QUANTITY: 1,
    REQUIRE_REASON: true,
    ENABLE_BULK_RETURNS: true  // NEW: Added rule
};


