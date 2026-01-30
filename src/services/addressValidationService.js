import { parseAddress, isValidZipCode, isValidState } from '../utils/addressParser.js';
import { geocodeAddress, structuredSearch } from './geocodingService.js';
import { VALIDATION_STATUS } from '../utils/constants.js';

/**
 * Main address validation service.
 * Orchestrates parsing, geocoding, and validation logic.
 */

/**
 * Validates and standardizes an address
 * @param {string} addressInput - Free-form address string
 * @returns {Promise<Object>} - Validation result
 */
export async function validateAddress(addressInput) {
  // Step 1: Parse the input address
  const parsed = parseAddress(addressInput);

  if (!parsed) {
    return createResponse(VALIDATION_STATUS.INVALID, null, null, [
      'Could not parse address input',
    ]);
  }

  // Step 2: Try geocoding the full address
  const geocoded = await geocodeAddress(addressInput);

  // Step 3: If geocoding failed, try structured search with parsed components
  let finalResult = geocoded;
  if (!geocoded && hasMinimumComponents(parsed)) {
    finalResult = await structuredSearch(parsed);
  }

  // Step 4: Determine validation status and build response
  if (!finalResult) {
    // Could not verify through geocoding
    return handleUnverifiableAddress(parsed);
  }

  // Check if the geocoded result is in the US
  if (finalResult.country && finalResult.country !== 'US') {
    return createResponse(
      VALIDATION_STATUS.INVALID,
      parsed,
      finalResult,
      ['Address is not in the United States. This service only validates US addresses.'],
    );
  }

  // Compare parsed vs geocoded to determine if corrections were made
  const { status, corrections } = determineStatus(parsed, finalResult);

  return createResponse(status, parsed, finalResult, [], corrections);
}

/**
 * Checks if we have minimum components for a valid address
 */
function hasMinimumComponents(parsed) {
  // At minimum, we need a street or city
  return !!(parsed.street || parsed.city);
}

/**
 * Handles addresses that couldn't be verified through geocoding
 */
function handleUnverifiableAddress(parsed) {
  const issues = [];

  // Check what's missing or invalid
  if (!parsed.streetNumber) {
    issues.push('Street number could not be determined');
  }
  if (!parsed.street) {
    issues.push('Street name could not be determined');
  }
  if (!parsed.city) {
    issues.push('City could not be determined');
  }
  if (!parsed.state) {
    issues.push('State could not be determined');
  } else if (!isValidState(parsed.state)) {
    issues.push(`Invalid state: ${parsed.state}`);
  }
  if (!parsed.zipCode) {
    issues.push('ZIP code could not be determined');
  } else if (!isValidZipCode(parsed.zipCode)) {
    issues.push(`Invalid ZIP code format: ${parsed.zipCode}`);
  }

  // If we have basic components, mark as unverifiable
  // Otherwise mark as invalid
  const hasBasicComponents = parsed.street || parsed.city;
  const status = hasBasicComponents
    ? VALIDATION_STATUS.UNVERIFIABLE
    : VALIDATION_STATUS.INVALID;

  return createResponse(status, parsed, null, issues);
}

/**
 * Determines the validation status by comparing parsed and geocoded results
 */
function determineStatus(parsed, geocoded) {
  const corrections = [];

  // Compare each field
  if (geocoded.streetNumber && parsed.streetNumber !== geocoded.streetNumber) {
    corrections.push({
      field: 'streetNumber',
      original: parsed.streetNumber,
      corrected: geocoded.streetNumber,
    });
  }

  if (geocoded.street && normalizeForComparison(parsed.street) !== normalizeForComparison(geocoded.street)) {
    corrections.push({
      field: 'street',
      original: parsed.street,
      corrected: geocoded.street,
    });
  }

  if (geocoded.city && normalizeForComparison(parsed.city) !== normalizeForComparison(geocoded.city)) {
    corrections.push({
      field: 'city',
      original: parsed.city,
      corrected: geocoded.city,
    });
  }

  if (geocoded.state && parsed.state?.toUpperCase() !== geocoded.state?.toUpperCase()) {
    corrections.push({
      field: 'state',
      original: parsed.state,
      corrected: geocoded.state,
    });
  }

  if (geocoded.zipCode && normalizeZip(parsed.zipCode) !== normalizeZip(geocoded.zipCode)) {
    corrections.push({
      field: 'zipCode',
      original: parsed.zipCode,
      corrected: geocoded.zipCode,
    });
  }

  // Determine status
  let status;
  if (corrections.length === 0) {
    status = VALIDATION_STATUS.VALID;
  } else if (geocoded.confidence >= 70) {
    status = VALIDATION_STATUS.CORRECTED;
  } else {
    status = VALIDATION_STATUS.UNVERIFIABLE;
  }

  return { status, corrections };
}

/**
 * Normalizes a string for comparison
 */
function normalizeForComparison(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes ZIP code for comparison (strips +4 extension)
 */
function normalizeZip(zip) {
  if (!zip) return '';
  return zip.replace(/-\d{4}$/, '');
}

/**
 * Creates the standardized API response
 */
function createResponse(status, parsed, geocoded, issues = [], corrections = []) {
  const response = {
    status,
    input: parsed?.raw || null,
    address: null,
    issues: issues.length > 0 ? issues : undefined,
    corrections: corrections.length > 0 ? corrections : undefined,
  };

  // Build the validated address object
  if (geocoded) {
    response.address = {
      streetNumber: geocoded.streetNumber,
      street: geocoded.street,
      unit: parsed?.unit || null,
      city: geocoded.city,
      state: geocoded.state,
      zipCode: geocoded.zipCode,
      formatted: formatAddress(geocoded, parsed?.unit),
    };
    response.coordinates = {
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    };
    response.confidence = geocoded.confidence;
  } else if (parsed && status === VALIDATION_STATUS.UNVERIFIABLE) {
    // Return parsed components even if unverifiable
    response.address = {
      streetNumber: parsed.streetNumber,
      street: parsed.street,
      unit: parsed.unit,
      city: parsed.city,
      state: parsed.state,
      zipCode: parsed.zipCode,
      formatted: null, // Don't provide formatted address for unverifiable
    };
  }

  return response;
}

/**
 * Formats address components into a standard string
 */
function formatAddress(components, unit) {
  const parts = [];

  // Street line
  const streetParts = [];
  if (components.streetNumber) streetParts.push(components.streetNumber);
  if (components.street) streetParts.push(components.street);
  if (unit) streetParts.push(unit);
  if (streetParts.length > 0) parts.push(streetParts.join(' '));

  // City, State ZIP
  const cityStateZip = [];
  if (components.city) cityStateZip.push(components.city);
  if (components.state) {
    if (cityStateZip.length > 0) {
      cityStateZip[cityStateZip.length - 1] += ',';
    }
    cityStateZip.push(components.state);
  }
  if (components.zipCode) cityStateZip.push(components.zipCode);
  if (cityStateZip.length > 0) parts.push(cityStateZip.join(' '));

  return parts.join(', ') || null;
}
