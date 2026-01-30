# Address Validation API

A backend API that validates and standardizes US property addresses. Given a free-form address input, it returns a structured, validated version including street, number, city, state, and ZIP code.

## Features

- **Address Parsing**: Extracts components from free-form text
- **Address Validation**: Verifies addresses using geocoding service
- **Address Standardization**: Normalizes street types, directions, and abbreviations
- **US-Only Support**: Restricted to United States addresses
- **Validation Status**: Returns `valid`, `corrected`, or `unverifiable` status
- **Correction Details**: Shows what was corrected when applicable

## API Endpoint

### POST /validate-address

Validates and standardizes a property address.

**Request:**
```json
{
  "address": "123 Main St, New York, NY 10001"
}
```

**Response (Valid):**
```json
{
  "status": "valid",
  "input": "123 Main St, New York, NY 10001",
  "address": {
    "streetNumber": "123",
    "street": "Main Street",
    "unit": null,
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "formatted": "123 Main Street, New York, NY 10001"
  },
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "confidence": 95
}
```

**Response (Corrected):**
```json
{
  "status": "corrected",
  "input": "123 Main Stret, New Yrok, NY",
  "address": {
    "streetNumber": "123",
    "street": "Main Street",
    "unit": null,
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "formatted": "123 Main Street, New York, NY 10001"
  },
  "corrections": [
    { "field": "street", "original": "Main Stret", "corrected": "Main Street" },
    { "field": "city", "original": "New Yrok", "corrected": "New York" }
  ],
  "confidence": 85
}
```

**Response (Unverifiable):**
```json
{
  "status": "unverifiable",
  "input": "Some Random Place",
  "address": {
    "streetNumber": null,
    "street": "Some Random Place",
    "unit": null,
    "city": null,
    "state": null,
    "zipCode": null,
    "formatted": null
  },
  "issues": [
    "City could not be determined",
    "State could not be determined",
    "ZIP code could not be determined"
  ]
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-26T12:00:00.000Z",
  "service": "address-validation-api",
  "version": "1.0.0"
}
```

## Validation Status Types

| Status | Description |
|--------|-------------|
| `valid` | Address verified and matches input |
| `corrected` | Address verified but corrections were made |
| `unverifiable` | Could not verify address through external service |
| `invalid` | Address is fundamentally invalid or non-US |

## Getting Started

### Prerequisites

- Node.js 18+ (for native fetch support)
- Yarn (or npm)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd address-validation-api

# Install dependencies
yarn install

# Copy environment file
cp .env.example .env
```

### Running Locally

```bash
# Development mode (with auto-reload)
yarn dev

# Production mode
yarn start
```

The API will be available at `http://localhost:3000`.

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch
```

## Project Structure

```
├── src/
│   ├── controllers/       # Request handlers
│   │   └── addressController.js
│   ├── services/          # Business logic
│   │   ├── addressValidationService.js
│   │   └── geocodingService.js
│   ├── middlewares/       # Express middlewares
│   │   └── errorHandler.js
│   ├── validators/        # Input validation
│   │   └── addressValidator.js
│   ├── utils/             # Helper functions
│   │   ├── addressParser.js
│   │   └── constants.js
│   ├── app.js             # Express app configuration
│   └── index.js           # Entry point
├── tests/                 # Test files
├── package.json
└── README.md
```

## Thought Process & Design Decisions

### Architecture

I chose a layered architecture separating concerns:
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Validators**: Input validation using express-validator
- **Utils**: Reusable helper functions

This makes the code testable, maintainable, and easy to extend.

### Geocoding Service

I chose **Nominatim (OpenStreetMap)** for address verification because:
- **Free to use** - No API key required for development
- **No vendor lock-in** - Easy to swap for production services
- **Good US coverage** - Adequate for the requirements

**Trade-offs:**
- Rate limited (1 request/second)
- Less accurate than paid services (Google Maps, Smarty)
- For production, I'd recommend integrating with USPS Web Tools or Smarty (SmartyStreets)

### Address Parsing

Built a custom address parser that:
- Handles common US address formats
- Normalizes street type abbreviations (St → Street, Ave → Avenue)
- Extracts unit/apartment information
- Handles directional prefixes (N, S, E, W)

This provides a fallback when geocoding fails and improves match quality.

### Validation Strategy

The validation follows a multi-step approach:
1. Parse input address locally
2. Try geocoding the full address
3. If geocoding fails, try structured search with parsed components
4. Compare results to determine if corrections were made
5. Return appropriate status with details

### Error Handling

- Input validation with express-validator
- Rate limiting (100 requests/15 minutes per IP)
- Security headers with Helmet
- Graceful handling of edge cases (partial addresses, typos)

## Production Considerations

For a production deployment, I would:

1. **Use a better geocoding service**: Smarty (SmartyStreets) or USPS Web Tools for better accuracy
2. **Add caching**: Cache geocoding results to reduce API calls
3. **Add logging**: Structured logging with Winston or Pino
4. **Add monitoring**: APM integration (DataDog, New Relic)
5. **Add API authentication**: JWT or API key based auth
6. **Database**: Store validation history for analytics
7. **Docker**: Containerize for easier deployment
