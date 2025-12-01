import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface OrganizerAuthResult {
  success: boolean;
  userId?: string;
  user?: any;
  error?: string;
  status?: number;
}

/**
 * Verify that the user is an organizer or admin
 */
export async function verifyOrganizer(
  request: NextRequest,
  requiredPermission?: 'canCreateChampionships' | 'canApproveSquadrons' | 'canLinkRaces' | 'canModifyStandings'
): Promise<OrganizerAuthResult> {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No autorizado',
        status: 401,
      };
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return {
        success: false,
        error: 'Token inválido',
        status: 401,
      };
    }

    await connectDB();

    // Get user with organizer profile
    const user = await WebUser.findById(userId);
    if (!user) {
      return {
        success: false,
        error: 'Usuario no encontrado',
        status: 404,
      };
    }

    // Check if user is organizer or admin
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return {
        success: false,
        error: 'Acceso denegado - Se requiere rol de organizador',
        status: 403,
      };
    }

    // If admin, bypass permission check (admin can do everything)
    if (user.role === 'admin') {
      return {
        success: true,
        userId,
        user,
      };
    }

    // If specific permission required, check it
    if (requiredPermission) {
      const hasPermission = user.organizerProfile?.permissions?.[requiredPermission];
      if (!hasPermission) {
        return {
          success: false,
          error: `Acceso denegado - Permiso requerido: ${requiredPermission}`,
          status: 403,
        };
      }
    }

    return {
      success: true,
      userId,
      user,
    };

  } catch (error: any) {
    console.error('Organizer verification error:', error);
    return {
      success: false,
      error: 'Error al verificar permisos',
      status: 500,
    };
  }
}

/**
 * Verify that the user is admin
 */
export async function verifyAdmin(request: NextRequest): Promise<OrganizerAuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No autorizado',
        status: 401,
      };
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return {
        success: false,
        error: 'Token inválido',
        status: 401,
      };
    }

    await connectDB();

    const admin = await WebUser.findById(userId);
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();

    if (!admin || admin.email.trim() !== adminEmail) {
      return {
        success: false,
        error: 'Acceso denegado - Solo administradores',
        status: 403,
      };
    }

    return {
      success: true,
      userId,
      user: admin,
    };

  } catch (error: any) {
    console.error('Admin verification error:', error);
    return {
      success: false,
      error: 'Error al verificar permisos de administrador',
      status: 500,
    };
  }
}
