import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

interface AdminUser {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@karteando.cl';

export async function verifyAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    // Get token from Authorization header or cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // Try to get from cookie as fallback
      token = request.cookies.get('auth-token')?.value;
    }

    if (!token) {
      return {
        isValid: false,
        error: 'No authentication token provided'
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AdminUser;

    // Check if user is admin (remove any trailing newlines or whitespace)
    const adminEmail = ADMIN_EMAIL.trim();
    if (decoded.email.trim() !== adminEmail) {
      console.error(`Admin check failed: ${decoded.email} !== ${adminEmail}`);
      return {
        isValid: false,
        error: 'Access denied. Admin privileges required.'
      };
    }
    
    return {
      isValid: true,
      user: decoded
    };
    
  } catch (error) {
    console.error('❌ Admin auth verification failed:', error);
    return {
      isValid: false,
      error: 'Invalid or expired token'
    };
  }
}

export { ADMIN_EMAIL };