# Bitespeed Identity Reconciliation Service

A web service that identifies and reconciles customer contacts across multiple purchases, even when different email addresses and phone numbers are used.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (via sql.js – pure JS, no native dependencies)

## Setup & Run

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build and run production
npm run build
npm start

# Run tests
npm test
```

The server starts on port `3000` (configurable via `PORT` env variable).

## API

### `POST /identify`

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string or number (optional)"
}
```
At least one of `email` or `phoneNumber` must be provided.

**Response (200):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

### `GET /`
Health check endpoint.

## How It Works

1. **New customer**: If no matching contacts exist, a new primary contact is created.
2. **Existing customer, new info**: If either email or phone matches an existing contact but the request contains new information, a secondary contact is created and linked to the primary.
3. **Merging primaries**: If a request links two previously separate primary contacts (e.g., email matches one primary, phone matches another), the newer primary is converted to secondary and linked to the older one.

## Project Structure

```
src/
├── index.ts       # Express server and routes
├── database.ts    # SQLite setup, schema, and query helpers
├── service.ts     # Core identity reconciliation logic
└── test.ts        # Automated test scenarios
```

## Host Link

Deployed link [Link](https://bitespeed-backend-task-vezi.onrender.com/)

