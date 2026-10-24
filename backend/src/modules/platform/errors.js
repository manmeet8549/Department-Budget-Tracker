/**
 * platform/errors.js
 * AppError — the one error class thrown by all services.
 * Error middleware (error-handler.js) catches it and formats the response.
 */

export class AppError extends Error {
  /**
   * @param {string} code    - machine-readable error code, e.g. 'INSUFFICIENT_BALANCE'
   * @param {string} message - human-readable message
   * @param {number} status  - HTTP status code (default 500)
   * @param {object} details - extra info for the client (default {})
   */
  constructor(code, message, status = 500, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    // Capture stack cleanly in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}
