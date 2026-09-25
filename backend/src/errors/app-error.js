export class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      throw new TypeError('AppError status must be an integer between 400 and 599');
    }
    if (typeof code !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(code)) {
      throw new TypeError('AppError code must use UPPER_SNAKE_CASE');
    }
    if (typeof message !== 'string' || !Array.isArray(details)) {
      throw new TypeError('AppError requires a string message and an array of details');
    }
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
