import { US_STATES, STREET_TYPES, DIRECTIONS, UNIT_TYPES } from './constants.js';

/**
 * Parses a free-form address string into structured components.
 * This is a best-effort parser that handles common US address formats.
 */
export function parseAddress(addressString) {
  if (!addressString || typeof addressString !== 'string') {
    return null;
  }

  // Normalize the input
  const normalized = addressString
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ', ');

  const result = {
    streetNumber: null,
    street: null,
    unit: null,
    city: null,
    state: null,
    zipCode: null,
    raw: addressString,
  };

  // Try to extract ZIP code (5 digits or 5+4 format)
  const zipMatch = normalized.match(/\b(\d{5})(?:-(\d{4}))?\b/);
  if (zipMatch) {
    result.zipCode = zipMatch[2] ? `${zipMatch[1]}-${zipMatch[2]}` : zipMatch[1];
  }

  // Try to extract state
  const stateResult = extractState(normalized);
  if (stateResult) {
    result.state = stateResult.abbreviation;
  }

  // Split address into parts
  const parts = normalized.split(',').map((p) => p.trim());

  if (parts.length >= 1) {
    // First part usually contains street address
    const streetPart = parts[0];
    const streetResult = parseStreetAddress(streetPart);
    result.streetNumber = streetResult.number;
    result.street = streetResult.street;
    result.unit = streetResult.unit;
  }

  if (parts.length >= 2) {
    // Second part might be city or city + state
    const cityStatePart = parts[1];
    const cityResult = extractCity(cityStatePart, result.state);
    if (cityResult) {
      result.city = cityResult;
    }
  }

  // If we have 3+ parts, try to get city from second part
  if (parts.length >= 3 && !result.city) {
    result.city = cleanCityName(parts[1]);
  }

  return result;
}

/**
 * Parses the street portion of an address
 */
function parseStreetAddress(streetPart) {
  const result = {
    number: null,
    street: null,
    unit: null,
  };

  if (!streetPart) return result;

  let working = streetPart;

  // Extract unit/apartment if present
  const unitPatterns = [
    /\b(apt|apartment|suite|ste|unit|#|floor|fl|room|rm)\.?\s*#?\s*(\w+)\s*$/i,
    /\s+#(\w+)\s*$/i,
  ];

  for (const pattern of unitPatterns) {
    const unitMatch = working.match(pattern);
    if (unitMatch) {
      const unitType = unitMatch[1] ? normalizeUnitType(unitMatch[1]) : 'Unit';
      const unitNumber = unitMatch[2] || unitMatch[1];
      result.unit = `${unitType} ${unitNumber}`.trim();
      working = working.replace(pattern, '').trim();
      break;
    }
  }

  // Extract street number (usually at the beginning)
  const numberMatch = working.match(/^(\d+[-\d]*[a-zA-Z]?)\s+/);
  if (numberMatch) {
    result.number = numberMatch[1];
    working = working.substring(numberMatch[0].length);
  }

  // Normalize street name
  result.street = normalizeStreetName(working);

  return result;
}

/**
 * Normalizes street name by standardizing abbreviations
 */
function normalizeStreetName(street) {
  if (!street) return null;

  let normalized = street.trim();

  // Normalize directional prefixes
  const words = normalized.split(/\s+/);
  const normalizedWords = words.map((word, index) => {
    const lower = word.toLowerCase().replace(/\.$/, '');

    // Check if it's a direction (usually first or last word)
    if (index === 0 || index === words.length - 1) {
      if (DIRECTIONS[lower]) {
        return DIRECTIONS[lower];
      }
    }

    // Check if it's a street type (usually last word)
    if (index === words.length - 1 || index === words.length - 2) {
      if (STREET_TYPES[lower]) {
        return STREET_TYPES[lower];
      }
    }

    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return normalizedWords.join(' ');
}

/**
 * Normalizes unit type abbreviation
 */
function normalizeUnitType(type) {
  const lower = type.toLowerCase().replace(/\.$/, '');
  return UNIT_TYPES[lower] || 'Unit';
}

/**
 * Extracts state from address string
 */
function extractState(address) {
  // Try to match state abbreviation (2 letters)
  const abbrevMatch = address.match(/\b([A-Z]{2})\b(?:\s+\d{5})?/i);
  if (abbrevMatch) {
    const abbrev = abbrevMatch[1].toUpperCase();
    if (US_STATES[abbrev]) {
      return { abbreviation: abbrev, name: US_STATES[abbrev] };
    }
  }

  // Try to match full state name
  const addressLower = address.toLowerCase();
  for (const [abbrev, name] of Object.entries(US_STATES)) {
    if (addressLower.includes(name.toLowerCase())) {
      return { abbreviation: abbrev, name };
    }
  }

  return null;
}

/**
 * Extracts city name from a part of the address
 */
function extractCity(part, knownState) {
  if (!part) return null;

  let city = part;

  // Remove state if present
  if (knownState) {
    const statePattern = new RegExp(`\\b${knownState}\\b`, 'i');
    city = city.replace(statePattern, '');
  }

  // Remove ZIP code if present
  city = city.replace(/\b\d{5}(-\d{4})?\b/, '');

  // Remove any state name
  for (const [abbrev, name] of Object.entries(US_STATES)) {
    city = city.replace(new RegExp(`\\b${abbrev}\\b`, 'i'), '');
    city = city.replace(new RegExp(`\\b${name}\\b`, 'i'), '');
  }

  return cleanCityName(city);
}

/**
 * Cleans and normalizes city name
 */
function cleanCityName(city) {
  if (!city) return null;

  const cleaned = city.trim().replace(/[,\s]+$/, '').replace(/^[,\s]+/, '');

  if (!cleaned) return null;

  // Capitalize each word
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validates ZIP code format
 */
export function isValidZipCode(zip) {
  if (!zip) return false;
  return /^\d{5}(-\d{4})?$/.test(zip);
}

/**
 * Validates state abbreviation
 */
export function isValidState(state) {
  if (!state) return false;
  return US_STATES.hasOwnProperty(state.toUpperCase());
}
