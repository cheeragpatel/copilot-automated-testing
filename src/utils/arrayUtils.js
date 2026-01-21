/**
 * Returns a new array with duplicate values removed.
 * @template T
 * @param {T[]} arr - The array to process.
 * @returns {T[]} A new array with unique values.
 * @example
 * unique([1, 2, 2, 3]) // [1, 2, 3]
 */
function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Splits an array into chunks of a specified size.
 * @template T
 * @param {T[]} arr - The array to split.
 * @param {number} size - The size of each chunk (must be a positive integer).
 * @returns {T[][]} An array of chunks.
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
function chunk(arr, size) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError('chunk size must be a positive integer');
  }

  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Randomly shuffles array elements using the Fisher-Yates algorithm.
 * @template T
 * @param {T[]} arr - The array to shuffle.
 * @returns {T[]} A new shuffled array.
 * @example
 * shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4] (random order)
 */
function shuffle(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Groups an array of objects by a specified key.
 * @template {Record<string, any>} T
 * @param {T[]} arr - The array of objects to group.
 * @param {keyof T & string} key - The key to group by.
 * @returns {Record<string, T[]>} An object mapping each key value to an array of items.
 * @example
 * groupBy(
 *   [{ type: 'fruit', name: 'apple' }, { type: 'fruit', name: 'banana' }, { type: 'veggie', name: 'carrot' }],
 *   'type'
 * )
 * // { fruit: [...], veggie: [...] }
 */
function groupBy(arr, key) {
  return arr.reduce((result, item) => {
    const groupKey = String(item[key]);
    (result[groupKey] ||= []).push(item);
    return result;
  }, /** @type {Record<string, T[]>} */ ({}));
}

export { unique, chunk, shuffle, groupBy };
export default { unique, chunk, shuffle, groupBy };

// Optional CommonJS compatibility (e.g., when required from CJS contexts).
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { unique, chunk, shuffle, groupBy };
}
