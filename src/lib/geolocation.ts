/**
 * Simple geolocation service using ip-api.com (free, no key required)
 * Rate limit: 45 requests per minute
 */

interface GeolocationResult {
  country?: string;
  city?: string;
  region?: string;
  lat?: number;
  lon?: number;
}

const cache = new Map<string, { data: GeolocationResult; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getGeolocation(ipAddress: string): Promise<GeolocationResult> {
  // Skip localhost/private IPs
  if (
    ipAddress === '127.0.0.1' ||
    ipAddress === 'localhost' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress === '::1'
  ) {
    return {
      country: 'Local',
      city: 'Localhost',
      region: 'Development'
    };
  }

  // Check cache
  const cached = cache.get(ipAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Use free ip-api.com service
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,city,regionName,lat,lon`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'success') {
      const result: GeolocationResult = {
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        lat: data.lat,
        lon: data.lon
      };

      // Cache result
      cache.set(ipAddress, { data: result, timestamp: Date.now() });

      return result;
    }

    return {};
  } catch (error) {
    console.error('Geolocation error:', error);
    return {};
  }
}

/**
 * Get IP address from request headers
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;

  // Try different headers in order of reliability
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}
