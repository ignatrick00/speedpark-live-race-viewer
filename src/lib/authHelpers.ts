import { NextRequest } from 'next/server';
import { verifyAdminAccess } from '@/middleware/adminAuth';

/**
 * Verifica si el request viene de un usuario admin
 * Retorna objeto con isAdmin y opcionalmente user/error
 */
export async function verifyAdmin(request: NextRequest): Promise<{
  isAdmin: boolean;
  user?: { userId: string; email: string };
  error?: string;
}> {
  const adminCheck = await verifyAdminAccess(request);

  if (!adminCheck.isValid) {
    return {
      isAdmin: false,
      error: adminCheck.error || 'Admin access required'
    };
  }

  return {
    isAdmin: true,
    user: adminCheck.user
  };
}
