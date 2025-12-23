/**
 * Request validation and sanitization utilities
 */

/**
 * Sanitize request body by handling empty, null, or undefined values properly
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
exports.sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const sanitized = {};

  Object.keys(body).forEach(key => {
    const value = body[key];
    
    // Handle null and undefined - skip them
    if (value === null || value === undefined) {
      return;
    }

    // Handle arrays - keep empty arrays to allow deselection
    if (Array.isArray(value)) {
      const cleanArray = value.filter(item => 
        item !== null && item !== undefined && item !== ''
      );
      // Include even empty arrays for filter parameters to allow deselection
      const filterParams = ['gender', 'categories', 'brands', 'colors', 'sizes', 'conditions', 'tags'];
      if (cleanArray.length > 0 || filterParams.includes(key)) {
        sanitized[key] = cleanArray;
      }
      return;
    }

    // Handle empty strings - skip only for non-search parameters
    if (value === '') {
      // Keep empty strings for search parameter to allow clearing search
      if (key === 'search') {
        sanitized[key] = '';
      }
      return;
    }

    // Handle objects recursively
    if (typeof value === 'object') {
      const cleanObject = exports.sanitizeRequestBody(value);
      if (Object.keys(cleanObject).length > 0) {
        sanitized[key] = cleanObject;
      }
      return;
    }

    // Handle strings - trim but keep meaningful empty states
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '' || key === 'search') {
        sanitized[key] = trimmed;
      }
      return;
    }

    // Handle booleans - always include them as they have meaningful false states
    if (typeof value === 'boolean') {
      sanitized[key] = value;
      return;
    }

    // For other types (number), include as-is if valid
    if (typeof value === 'number' && !isNaN(value)) {
      sanitized[key] = value;
      return;
    }

    // For other valid types, include as-is
    sanitized[key] = value;
  });

  return sanitized;
};

/**
 * Validate that the request has valid structure for ProductFilter
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
exports.validateProductFilterRequest = (req) => {
  const errors = [];
  const warnings = [];

  // Check if body exists for POST requests
  if (req.method === 'POST' && (!req.body || Object.keys(req.body).length === 0)) {
    warnings.push('POST request has empty body, using query parameters only');
  }

  // Validate common parameters
  const allParams = { ...req.query, ...req.body };

  // Validate page parameter
  if (allParams.page !== undefined) {
    const page = parseInt(allParams.page);
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive integer');
    } else if (page > 1000) {
      warnings.push('Page number is very high, this might affect performance');
    }
  }

  // Validate limit parameter
  if (allParams.limit !== undefined) {
    const limit = parseInt(allParams.limit);
    if (isNaN(limit) || limit < 1) {
      errors.push('Limit must be a positive integer');
    } else if (limit > 2000) {
      warnings.push('Limit is capped at 2000 items per request');
    }
  }

  // Validate price parameters
  if (allParams.minPrice !== undefined) {
    const minPrice = parseFloat(allParams.minPrice);
    if (isNaN(minPrice) || minPrice < 0) {
      errors.push('minPrice must be a non-negative number');
    }
  }

  if (allParams.maxPrice !== undefined) {
    const maxPrice = parseFloat(allParams.maxPrice);
    if (isNaN(maxPrice) || maxPrice < 0) {
      errors.push('maxPrice must be a non-negative number');
    }
  }

  // Validate array parameters
  const arrayParams = ['gender', 'categories', 'brands', 'colors', 'sizes', 'conditions', 'tags'];
  arrayParams.forEach(param => {
    if (allParams[param] !== undefined && !Array.isArray(allParams[param])) {
      // Try to convert string to array (in case it's sent as comma-separated)
      if (typeof allParams[param] === 'string') {
        warnings.push(`Parameter '${param}' should be an array, attempting to parse as comma-separated values`);
      } else {
        errors.push(`Parameter '${param}' must be an array`);
      }
    }
  });

  // Validate gender values
  if (allParams.gender) {
    const validGenders = ['men', 'women', 'kids', 'unisex'];
    const genders = Array.isArray(allParams.gender) ? allParams.gender : [allParams.gender];
    const invalidGenders = genders.filter(g => !validGenders.includes(g.toLowerCase()));
    if (invalidGenders.length > 0) {
      errors.push(`Invalid gender values: ${invalidGenders.join(', ')}. Valid values are: ${validGenders.join(', ')}`);
    }
  }

  // Validate sort parameter
  if (allParams.sort !== undefined && typeof allParams.sort !== 'string') {
    errors.push('Sort parameter must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedParams: exports.sanitizeRequestBody(allParams)
  };
};

/**
 * Convert string parameters to arrays where applicable
 * @param {Object} params - Request parameters
 * @returns {Object} Converted parameters
 */
exports.convertStringArrays = (params) => {
  const converted = { ...params };
  const arrayParams = ['gender', 'categories', 'brands', 'colors', 'sizes', 'conditions', 'tags'];

  arrayParams.forEach(param => {
    if (converted[param] && typeof converted[param] === 'string') {
      // Split by comma and clean up
      converted[param] = converted[param]
        .split(',')
        .map(item => item.trim())
        .filter(item => item !== '');
    }
  });

  return converted;
};

/**
 * Express middleware for handling JSON parsing errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
exports.jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('🚨 JSON Parse Error:', {
      message: err.message,
      body: err.body,
      url: req.url,
      method: req.method,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: {
        type: 'JSON_PARSE_ERROR',
        message: 'The request contains malformed JSON. Please check your request body.',
        details: err.message.replace(/^[^"]*"([^"]+)".*$/, '$1'), // Extract the problematic part
        suggestions: [
          'Ensure all string values are properly quoted',
          'Check for trailing commas',
          'Verify all brackets and braces are properly closed',
          'Use a JSON validator to check your request body'
        ]
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};