import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/admin/migrate-collection-name
 * Migra datos de 'friendlyraces' a 'friendly_races' y actualiza campos
 * Solo accesible por administradores
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar que sea admin
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden ejecutar migraciones' },
        { status: 403 }
      );
    }

    console.log('🔧 [MIGRATION] Starting collection migration...');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Verificar si existe la colección vieja
    const collections = await db.listCollections().toArray();
    const oldCollectionExists = collections.some(c => c.name === 'friendlyraces');
    const newCollectionExists = collections.some(c => c.name === 'friendly_races');

    console.log(`📊 [MIGRATION] Old collection exists: ${oldCollectionExists}`);
    console.log(`📊 [MIGRATION] New collection exists: ${newCollectionExists}`);

    if (!oldCollectionExists) {
      return NextResponse.json({
        success: true,
        message: 'No hay nada que migrar, la colección vieja no existe',
        migrated: 0
      });
    }

    const oldCollection = db.collection('friendlyraces');
    const newCollection = db.collection('friendly_races');

    // Contar documentos en colección vieja
    const oldCount = await oldCollection.countDocuments();
    console.log(`📊 [MIGRATION] Found ${oldCount} documents in old collection`);

    if (oldCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'La colección vieja está vacía, no hay nada que migrar',
        migrated: 0
      });
    }

    // Obtener todos los documentos de la colección vieja
    const oldDocs = await oldCollection.find({}).toArray();

    // Migrar documentos con campos actualizados
    const migratedDocs = oldDocs.map(doc => ({
      ...doc,
      // Asegurar que todos tengan los campos de vinculación
      raceStatus: doc.raceStatus || 'pending',
      linkedRaceSessionId: doc.linkedRaceSessionId || null,
      results: doc.results || null,
      maxParticipants: doc.maxParticipants || 12,
      status: doc.status || 'open',
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    }));

    // Insertar en la nueva colección
    if (migratedDocs.length > 0) {
      await newCollection.insertMany(migratedDocs);
      console.log(`✅ [MIGRATION] Inserted ${migratedDocs.length} documents into new collection`);
    }

    // Opcional: Eliminar colección vieja (comentado por seguridad)
    // await oldCollection.drop();
    // console.log('🗑️ [MIGRATION] Dropped old collection');

    console.log(`✅ [MIGRATION] Migration completed successfully`);

    return NextResponse.json({
      success: true,
      message: 'Migración completada. La colección vieja todavía existe (elimínala manualmente si quieres)',
      migrated: migratedDocs.length,
      oldCollection: 'friendlyraces',
      newCollection: 'friendly_races',
      note: 'Para eliminar la colección vieja, ejecuta en MongoDB: db.friendlyraces.drop()'
    });

  } catch (error) {
    console.error('❌ [MIGRATION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al ejecutar migración',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
