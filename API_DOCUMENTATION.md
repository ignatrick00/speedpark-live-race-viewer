# SMS-Timing API Documentation

Generated: 2025-08-05T19:51:19.914Z
User: Break Pitt (63000000000383541)

## Authentication Headers

All requests must include these headers:

```javascript
const headers = {
  'X-Fast-DeviceToken': '1111111129R2A932939',
  'X-Fast-AccessToken': '51klijayaaiyamkojkj',
  'X-Fast-Version': '6250311 202504181931',
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};
```

## Working Endpoints (3)

### `GET /racestatistics/sessionv2/speedpark?sessionId=31907477`

Datos de sesión v2

**Response Structure:**
- Array with 14 items
- Item structure: ivId, id, personId, alias, firstName, name, position, totalPoints, scoreDefault, score

### `GET /racestatistics/laps_fast5/speedpark?sessionId=31907477`

Top 5 vueltas rápidas

**Response Structure:**
- Array with 181 items
- Item structure: lapNumber, LapTimeMs, startTime, participantId, activeParticipantId, kartNumber, firstName, lastName, alias, position, points

### `GET /activity-history/details/speedpark?sessionId=31907477`

Detalles del historial

**Response Structure:**
- Object with keys: settings, scorings, participants, id, resourceId, resourceKind, sessionState, date, name, bestTimeMs, bestTime, finishPosition, winner, winnerPersonId, blueKartsLink, rulesWebPageId

## Usage Example

```javascript
const https = require('https');

const AUTH_HEADERS = {
  'X-Fast-DeviceToken': '1111111129R2A932939',
  'X-Fast-AccessToken': '51klijayaaiyamkojkj',
  'X-Fast-Version': '6250311 202504181931',
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

function makeRequest(endpoint) {
  const url = 'https://mobile-api22.sms-timing.com/api' + endpoint;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: AUTH_HEADERS }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}
```
