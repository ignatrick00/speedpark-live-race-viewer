// SMS-Timing API Client
// Generated: 2025-08-05T19:51:19.916Z

class SMSTimingAPI {
  constructor() {
    this.baseURL = 'https://mobile-api22.sms-timing.com/api';
    this.headers = {
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
  }

  async makeRequest(endpoint) {
    const response = await fetch(this.baseURL + endpoint, {
      headers: this.headers
    });
    return response.json();
  }

  // Datos de sesión v2
  async racestatistics_sessionv2_speedpark_sessionId_31907477() {
    return this.makeRequest('/racestatistics/sessionv2/speedpark?sessionId=31907477');
  }

  // Top 5 vueltas rápidas
  async racestatistics_laps_fast5_speedpark_sessionId_31907477() {
    return this.makeRequest('/racestatistics/laps_fast5/speedpark?sessionId=31907477');
  }

  // Detalles del historial
  async activity_history_details_speedpark_sessionId_31907477() {
    return this.makeRequest('/activity-history/details/speedpark?sessionId=31907477');
  }

}

// Usage example:
// const api = new SMSTimingAPI();
// const data = await api.person_63000000000383541();
