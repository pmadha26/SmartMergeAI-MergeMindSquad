/**
 * Validation utilities for user profile updates
 * Provides comprehensive validation rules for common user profile fields
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UserProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    if (email.length > 255) {
      errors.push('Email must not exceed 255 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates phone number format
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  
  if (!phone || phone.trim() === '') {
    errors.push('Phone number is required');
  } else {
    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      errors.push('Invalid phone number format. Must be 10-15 digits');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates name fields (first name, last name)
 */
export function validateName(name: string, fieldName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim() === '') {
    errors.push(`${fieldName} is required`);
  } else {
    if (name.length < 2) {
      errors.push(`${fieldName} must be at least 2 characters`);
    }
    if (name.length > 50) {
      errors.push(`${fieldName} must not exceed 50 characters`);
    }
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates date of birth
 */
export function validateDateOfBirth(dateOfBirth: string): ValidationResult {
  const errors: string[] = [];
  
  if (!dateOfBirth || dateOfBirth.trim() === '') {
    errors.push('Date of birth is required');
  } else {
    const date = new Date(dateOfBirth);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    } else {
      // Check if date is in the future
      if (date > now) {
        errors.push('Date of birth cannot be in the future');
      }
      
      // Check minimum age (13 years)
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 13);
      if (date > minAge) {
        errors.push('User must be at least 13 years old');
      }
      
      // Check maximum age (120 years)
      const maxAge = new Date();
      maxAge.setFullYear(maxAge.getFullYear() - 120);
      if (date < maxAge) {
        errors.push('Invalid date of birth');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates zip code
 */
export function validateZipCode(zipCode: string, country: string = 'US'): ValidationResult {
  const errors: string[] = [];
  
  if (!zipCode || zipCode.trim() === '') {
    errors.push('Zip code is required');
  } else {
    let zipRegex: RegExp;
    
    switch (country.toUpperCase()) {
      case 'US':
        zipRegex = /^\d{5}(-\d{4})?$/;
        if (!zipRegex.test(zipCode)) {
          errors.push('Invalid US zip code format (e.g., 12345 or 12345-6789)');
        }
        break;
      case 'CA':
        zipRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
        if (!zipRegex.test(zipCode)) {
          errors.push('Invalid Canadian postal code format (e.g., A1A 1A1)');
        }
        break;
      default:
        if (zipCode.length < 3 || zipCode.length > 10) {
          errors.push('Zip code must be between 3 and 10 characters');
        }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete user profile data
 */
export function validateUserProfile(profile: UserProfileData): ValidationResult {
  const allErrors: string[] = [];
  
  // Validate first name
  if (profile.firstName !== undefined) {
    const firstNameResult = validateName(profile.firstName, 'First name');
    allErrors.push(...firstNameResult.errors);
  }
  
  // Validate last name
  if (profile.lastName !== undefined) {
    const lastNameResult = validateName(profile.lastName, 'Last name');
    allErrors.push(...lastNameResult.errors);
  }
  
  // Validate email
  if (profile.email !== undefined) {
    const emailResult = validateEmail(profile.email);
    allErrors.push(...emailResult.errors);
  }
  
  // Validate phone
  if (profile.phone !== undefined) {
    const phoneResult = validatePhone(profile.phone);
    allErrors.push(...phoneResult.errors);
  }
  
  // Validate date of birth
  if (profile.dateOfBirth !== undefined) {
    const dobResult = validateDateOfBirth(profile.dateOfBirth);
    allErrors.push(...dobResult.errors);
  }
  
  // Validate address fields
  if (profile.address) {
    if (profile.address.zipCode && profile.address.country) {
      const zipResult = validateZipCode(profile.address.zipCode, profile.address.country);
      allErrors.push(...zipResult.errors);
    }
    
    if (profile.address.city) {
      const cityResult = validateName(profile.address.city, 'City');
      allErrors.push(...cityResult.errors);
    }
    
    if (profile.address.state && profile.address.state.length > 50) {
      allErrors.push('State must not exceed 50 characters');
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validates and sanitizes user profile data
 */
export function validateAndSanitizeProfile(profile: UserProfileData): {
  isValid: boolean;
  errors: string[];
  sanitizedProfile: UserProfileData;
} {
  const validationResult = validateUserProfile(profile);
  
  const sanitizedProfile: UserProfileData = {
    firstName: profile.firstName ? sanitizeInput(profile.firstName) : undefined,
    lastName: profile.lastName ? sanitizeInput(profile.lastName) : undefined,
    email: profile.email ? sanitizeInput(profile.email) : undefined,
    phone: profile.phone ? sanitizeInput(profile.phone) : undefined,
    dateOfBirth: profile.dateOfBirth,
    address: profile.address ? {
      street: profile.address.street ? sanitizeInput(profile.address.street) : undefined,
      city: profile.address.city ? sanitizeInput(profile.address.city) : undefined,
      state: profile.address.state ? sanitizeInput(profile.address.state) : undefined,
      zipCode: profile.address.zipCode ? sanitizeInput(profile.address.zipCode) : undefined,
      country: profile.address.country ? sanitizeInput(profile.address.country) : undefined,
    } : undefined
  };
  
  return {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    sanitizedProfile
  };
}

// Made with Bob
