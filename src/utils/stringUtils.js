/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The string with the first letter capitalized.
 */
function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to a URL-friendly slug.
 * @param {string} str - The string to slugify.
 * @returns {string} The slugified string.
 */
function slugify(str) {
  if (typeof str !== 'string') {
    return '';
  }

  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncates a string to a specified maximum length and adds an ellipsis if truncated.
 * @param {string} str - The string to truncate.
 * @param {number} maxLength - The maximum length of the returned string (including ellipsis).
 * @returns {string} The truncated string with ellipsis if needed.
 */
function truncate(str, maxLength) {
  if (typeof str !== 'string') {
    return '';
  }
  if (typeof maxLength !== 'number' || !Number.isFinite(maxLength) || maxLength < 0) {
    return '';
  }
  if (str.length <= maxLength) {
    return str;
  }
  if (maxLength <= 3) {
    return '.'.repeat(Math.max(0, maxLength));
  }
  return str.slice(0, maxLength - 3) + '...';
}

export { capitalize, slugify, truncate };
export default { capitalize, slugify, truncate };

// Optional CommonJS compatibility (e.g., when required from CJS contexts).
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { capitalize, slugify, truncate };
}
