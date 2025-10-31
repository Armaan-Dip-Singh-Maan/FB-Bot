/**
 * Security Utilities
 * Protects against prompt injection attacks and malicious inputs
 */

class SecurityValidator {
  constructor() {
    // Common prompt injection patterns
    this.injectionPatterns = [
      // Direct instruction override attempts
      /ignore\s+(previous|all|above|prior)\s+(instructions?|commands?|directions?)/i,
      /forget\s+(previous|all|above|prior)/i,
      /disregard\s+(previous|all|above|prior)/i,
      /override\s+(previous|all|above|prior)/i,
      
      // System prompt injections
      /you\s+are\s+now\s+a/i,
      /act\s+as\s+if/i,
      /pretend\s+to\s+be/i,
      /roleplay\s+as/i,
      
      // Instruction manipulation
      /new\s+instructions?:/i,
      /revised\s+instructions?:/i,
      /updated\s+instructions?:/i,
      /system\s+prompt/i,
      /system\s+message/i,
      
      // Encoding attempts
      /\<\?xml/i,
      /\<script/i,
      /javascript:/i,
      /data:text\/html/i,
      
      // Direct API manipulation
      /api\s+key/i,
      /openai/i,
      /model\s+(override|change|switch)/i,
      
      // Jailbreak attempts
      /jailbreak/i,
      /developer\s+mode/i,
      /debug\s+mode/i,
      /admin\s+mode/i,
      
      // Format manipulation
      /\{\{.*\}\}/, // Template injection patterns
      /\{\%.*\%\}/,
    ];

    // Maximum message length to prevent DoS
    this.maxMessageLength = 2000;
    
    // Maximum conversation history length
    this.maxHistoryLength = 50;
  }

  /**
   * Sanitize user input
   * @param {string} input - User input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Trim and limit length
    let sanitized = input.trim().slice(0, this.maxMessageLength);

    // Remove null bytes and control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace (keep single spaces, newlines, tabs)
    sanitized = sanitized.replace(/[ \t]+/g, ' ');
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

    return sanitized;
  }

  /**
   * Check for prompt injection attempts
   * @param {string} input - User input to check
   * @returns {Object} Validation result
   */
  validateInput(input) {
    const result = {
      isValid: true,
      sanitized: '',
      threats: [],
      score: 0
    };

    // Check if input is too long
    if (input && input.length > this.maxMessageLength) {
      result.threats.push('Message too long');
      result.score += 10;
      result.sanitized = input.slice(0, this.maxMessageLength);
    } else {
      result.sanitized = input || '';
    }

    // Sanitize input
    result.sanitized = this.sanitizeInput(result.sanitized);

    // Check for injection patterns
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(result.sanitized)) {
        result.threats.push(`Potential injection: ${pattern.source}`);
        result.score += 5;
      }
    }

    // Check for suspicious patterns (multiple special characters)
    const specialCharRatio = (result.sanitized.match(/[<>{}[\]\\|`~!@#$%^&*()+=\-]/g) || []).length / Math.max(result.sanitized.length, 1);
    if (specialCharRatio > 0.3 && result.sanitized.length > 50) {
      result.threats.push('High ratio of special characters');
      result.score += 3;
    }

    // Final validation
    if (result.score >= 10 || result.threats.length >= 3) {
      result.isValid = false;
    }

    return result;
  }

  /**
   * Sanitize context before passing to LLM
   * @param {string} context - Context from knowledge base
   * @returns {string} Sanitized context
   */
  sanitizeContext(context) {
    if (!context || typeof context !== 'string') {
      return '';
    }

    // Limit context length
    let sanitized = context.slice(0, 5000);

    // Remove potential injection markers
    sanitized = sanitized.replace(/\[CALENDLY_SUGGESTION\]/g, '');
    sanitized = sanitized.replace(/\[SYSTEM\]/g, '');
    sanitized = sanitized.replace(/\[INSTRUCTION\]/g, '');

    return sanitized;
  }

  /**
   * Validate and sanitize user message for LLM processing
   * @param {string} message - User message
   * @returns {Object} Validation result with sanitized message
   */
  validateForLLM(message) {
    const validation = this.validateInput(message);

    if (!validation.isValid) {
      // If high threat score, return a generic message
      validation.sanitized = 'I received your message but need to keep our conversation focused on franchise opportunities. How can I help you find the right franchise?';
    }

    return validation;
  }
}

module.exports = { SecurityValidator };

