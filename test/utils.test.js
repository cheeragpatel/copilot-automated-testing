import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { capitalize, truncate } from '../src/utils/stringUtils.js';

describe('String utility functions', () => {
  describe('capitalize()', () => {
    it('capitalizes a normal string', () => {
      assert.equal(capitalize('hello'), 'Hello');
      assert.equal(capitalize('world'), 'World');
    });

    it('handles empty string and non-strings (including null)', () => {
      assert.equal(capitalize(''), '');
      assert.equal(capitalize(null), '');
      assert.equal(capitalize(undefined), '');
    });

    it('handles special characters and whitespace', () => {
      assert.equal(capitalize('!hello'), '!hello');
      assert.equal(capitalize('123abc'), '123abc');
      assert.equal(capitalize(' hello'), ' hello');
    });

    it('handles unicode (including combining marks) and emoji', () => {
      assert.equal(capitalize('école'), 'École');
      assert.equal(capitalize('日本語'), '日本語');
      assert.equal(capitalize('e\u0301'), 'E\u0301');
      assert.equal(capitalize('😀hello'), '😀hello');
    });
  });

  describe('truncate()', () => {
    it('does not truncate when string is shorter than or equal to maxLength', () => {
      assert.equal(truncate('hello', 10), 'hello');
      assert.equal(truncate('hello', 5), 'hello');
    });

    it('truncates when string is longer than maxLength (ellipsis included in maxLength)', () => {
      assert.equal(truncate('hello world', 5), 'he...');
      assert.equal(truncate('hello world', 10), 'hello w...');
    });

    it('handles edge maxLength values (0..3)', () => {
      assert.equal(truncate('hello', 0), '');
      assert.equal(truncate('hello', 1), '.');
      assert.equal(truncate('hello', 2), '..');
      assert.equal(truncate('hello', 3), '...');
    });

    it('returns empty string for invalid inputs (null or invalid maxLength)', () => {
      assert.equal(truncate(null, 10), '');
      assert.equal(truncate('hello', -1), '');
      assert.equal(truncate('hello', NaN), '');
      assert.equal(truncate('hello', undefined), '');
    });

    it('handles special characters and unicode', () => {
      assert.equal(truncate('!@#$%^&*()', 6), '!@#...');
      assert.equal(truncate('école', 4), 'é...');
      assert.equal(truncate('日本語テキスト', 5), '日本...');
    });

    it('handles emoji (UTF-16 surrogate pairs) without throwing', () => {
      assert.equal(truncate('😀😁😂😃😄', 7), '😀😁...');
    });
  });
});
