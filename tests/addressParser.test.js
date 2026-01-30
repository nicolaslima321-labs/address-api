import { parseAddress, isValidZipCode, isValidState } from '../src/utils/addressParser.js';

describe('parseAddress', () => {
  test('parses a complete US address', () => {
    const result = parseAddress('123 Main Street, New York, NY 10001');

    expect(result.streetNumber).toBe('123');
    expect(result.street).toBe('Main Street');
    expect(result.city).toBe('New York');
    expect(result.state).toBe('NY');
    expect(result.zipCode).toBe('10001');
  });

  test('parses address with apartment', () => {
    const result = parseAddress('456 Oak Ave Apt 2B, Los Angeles, CA 90001');

    expect(result.streetNumber).toBe('456');
    expect(result.street).toBe('Oak Avenue');
    expect(result.unit).toBe('Apt 2B');
    expect(result.city).toBe('Los Angeles');
    expect(result.state).toBe('CA');
  });

  test('parses address with suite', () => {
    const result = parseAddress('789 Broadway Suite 100, San Francisco, CA 94102');

    expect(result.streetNumber).toBe('789');
    expect(result.unit).toContain('Suite');
    expect(result.state).toBe('CA');
  });

  test('normalizes street abbreviations', () => {
    const result = parseAddress('100 First St, Boston, MA 02101');

    expect(result.street).toBe('First Street');
  });

  test('handles ZIP+4 format', () => {
    const result = parseAddress('200 Park Ave, New York, NY 10166-0001');

    expect(result.zipCode).toBe('10166-0001');
  });

  test('handles missing components gracefully', () => {
    const result = parseAddress('Main Street, Somewhere');

    expect(result).not.toBeNull();
    expect(result.street).toBeTruthy();
  });

  test('returns null for empty input', () => {
    expect(parseAddress('')).toBeNull();
    expect(parseAddress(null)).toBeNull();
    expect(parseAddress(undefined)).toBeNull();
  });

  test('parses address with directional prefix', () => {
    const result = parseAddress('500 N Michigan Ave, Chicago, IL 60611');

    expect(result.streetNumber).toBe('500');
    expect(result.street).toContain('Michigan');
    expect(result.state).toBe('IL');
  });
});

describe('isValidZipCode', () => {
  test('validates 5-digit ZIP codes', () => {
    expect(isValidZipCode('12345')).toBe(true);
    expect(isValidZipCode('00000')).toBe(true);
    expect(isValidZipCode('99999')).toBe(true);
  });

  test('validates ZIP+4 format', () => {
    expect(isValidZipCode('12345-6789')).toBe(true);
  });

  test('rejects invalid ZIP codes', () => {
    expect(isValidZipCode('1234')).toBe(false);
    expect(isValidZipCode('123456')).toBe(false);
    expect(isValidZipCode('ABCDE')).toBe(false);
    expect(isValidZipCode('')).toBe(false);
    expect(isValidZipCode(null)).toBe(false);
  });
});

describe('isValidState', () => {
  test('validates state abbreviations', () => {
    expect(isValidState('NY')).toBe(true);
    expect(isValidState('CA')).toBe(true);
    expect(isValidState('TX')).toBe(true);
    expect(isValidState('ny')).toBe(true); // case insensitive
  });

  test('rejects invalid states', () => {
    expect(isValidState('XX')).toBe(false);
    expect(isValidState('USA')).toBe(false);
    expect(isValidState('')).toBe(false);
    expect(isValidState(null)).toBe(false);
  });
});
