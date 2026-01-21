/**
 * Validates email format using regex.
 * @param {string} str
 * @returns {boolean}
 */
function isEmail(str) {
  if (typeof str !== 'string') return false;
  // Practical email regex (not fully RFC 5322, but good for validation).
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

/**
 * Validates URL format.
 * @param {string} str
 * @returns {boolean}
 */
function isURL(str) {
  if (typeof str !== 'string') return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks string is not null/undefined/empty.
 * @param {string} str
 * @returns {boolean}
 */
function isNotEmpty(str) {
  return typeof str === 'string' && str.length > 0;
}

/**
 * Checks if value is a valid number.
 * Accepts numbers and numeric strings.
 * @param {*} val
 * @returns {boolean}
 */
function isNumber(val) {
  if (typeof val === 'number') return Number.isFinite(val);
  if (typeof val === 'string' && val.trim() !== '') return Number.isFinite(Number(val));
  return false;
}

/**
 * Checks if number is within range (inclusive).
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function isInRange(num, min, max) {
  if (!isNumber(num) || !isNumber(min) || !isNumber(max)) return false;
  const n = Number(num);
  const lo = Number(min);
  const hi = Number(max);
  return n >= lo && n <= hi;
}

export { isEmail, isURL, isNotEmpty, isNumber, isInRange };
export default { isEmail, isURL, isNotEmpty, isNumber, isInRange };

// Optional CommonJS compatibility (e.g., when required from CJS contexts).
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { isEmail, isURL, isNotEmpty, isNumber, isInRange };
}
