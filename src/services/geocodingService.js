/**
 * Geocoding service using Nominatim (OpenStreetMap).
 * This is a free service with usage limits (1 request/second).
 * For production, consider using Google Maps, Smarty, or USPS APIs.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'AddressValidationAPI/1.0';

/**
 * Geocodes an address using Nominatim
 * @param {string} address - Free-form address string
 * @returns {Promise<Object|null>} - Geocoding result or null if not found
 */
export async function geocodeAddress(address) {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'us', // Restrict to US addresses
      limit: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return null;
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    return normalizeNominatimResult(results[0]);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

/**
 * Performs structured address search
 * @param {Object} components - Address components
 * @returns {Promise<Object|null>} - Geocoding result or null
 */
export async function structuredSearch(components) {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'us',
      limit: '1',
    });

    if (components.street) {
      params.append('street', `${components.streetNumber || ''} ${components.street}`.trim());
    }
    if (components.city) {
      params.append('city', components.city);
    }
    if (components.state) {
      params.append('state', components.state);
    }
    if (components.zipCode) {
      params.append('postalcode', components.zipCode);
    }

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    return normalizeNominatimResult(results[0]);
  } catch (error) {
    console.error('Structured search error:', error.message);
    return null;
  }
}

/**
 * Normalizes Nominatim result to our standard format
 */
function normalizeNominatimResult(result) {
  const addr = result.address || {};

  // Extract street number and name
  let streetNumber = addr.house_number || null;
  let street = addr.road || addr.pedestrian || addr.street || null;

  // Build city from available fields
  const city =
    addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || null;

  // Get state abbreviation
  const state = getStateAbbreviation(addr.state);

  // Get ZIP code
  const zipCode = addr.postcode || null;

  return {
    streetNumber,
    street,
    city,
    state,
    zipCode,
    country: addr.country_code?.toUpperCase() || 'US',
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    confidence: calculateConfidence(result),
    displayName: result.display_name,
    placeType: result.type,
    importance: result.importance,
  };
}

/**
 * Converts full state name to abbreviation
 */
function getStateAbbreviation(stateName) {
  if (!stateName) return null;

  // If already an abbreviation
  if (stateName.length === 2) {
    return stateName.toUpperCase();
  }

  const stateMap = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    hawaii: 'HI',
    idaho: 'ID',
    illinois: 'IL',
    indiana: 'IN',
    iowa: 'IA',
    kansas: 'KS',
    kentucky: 'KY',
    louisiana: 'LA',
    maine: 'ME',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    minnesota: 'MN',
    mississippi: 'MS',
    missouri: 'MO',
    montana: 'MT',
    nebraska: 'NE',
    nevada: 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    ohio: 'OH',
    oklahoma: 'OK',
    oregon: 'OR',
    pennsylvania: 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    tennessee: 'TN',
    texas: 'TX',
    utah: 'UT',
    vermont: 'VT',
    virginia: 'VA',
    washington: 'WA',
    'west virginia': 'WV',
    wisconsin: 'WI',
    wyoming: 'WY',
    'district of columbia': 'DC',
  };

  return stateMap[stateName.toLowerCase()] || stateName;
}

/**
 * Calculates confidence score based on result quality
 */
function calculateConfidence(result) {
  let score = 0;
  const addr = result.address || {};

  // Has house number
  if (addr.house_number) score += 25;

  // Has street name
  if (addr.road || addr.street) score += 25;

  // Has city
  if (addr.city || addr.town || addr.village) score += 20;

  // Has state
  if (addr.state) score += 15;

  // Has ZIP code
  if (addr.postcode) score += 15;

  // Adjust based on importance (0-1 from Nominatim)
  if (result.importance) {
    score = Math.min(100, score * (0.5 + result.importance * 0.5));
  }

  return Math.round(score);
}
