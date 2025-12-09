import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverIdentity from '@/models/DriverIdentity';
import WebUser from '@/models/WebUser';
import LapRecord from '@/models/LapRecord';
import RaceSessionV0 from '@/models/RaceSessionV0';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list_all';
    const search = searchParams.get('search') || '';
    
    if (action === 'list_all') {
      // 🆕 Obtener corredores desde race_sessions_v0 (nueva estructura)
      const drivers = await RaceSessionV0.aggregate([
        // 1. Descomponer array de drivers
        { $unwind: '$drivers' },

        // 2. Ordenar por fecha descendente (más reciente primero)
        { $sort: { sessionDate: -1 } },

        // 3. Agrupar por nombre de driver
        {
          $group: {
            _id: '$drivers.driverName',
            totalSessions: { $addToSet: '$sessionId' },
            totalLaps: { $sum: '$drivers.totalLaps' },
            bestPosition: { $min: '$drivers.finalPosition' },
            bestTime: { $min: { $cond: [{ $gt: ['$drivers.bestTime', 0] }, '$drivers.bestTime', null] } },
            lastRace: { $max: '$sessionDate' },
            firstRace: { $min: '$sessionDate' },
            // Obtener linkedUserId y personId (usar $first para obtener el más reciente después de ordenar)
            linkedUserId: { $first: '$drivers.linkedUserId' },
            personId: { $first: '$drivers.personId' }
          }
        },

        // 3. Lookup a webusers para obtener info del usuario vinculado
        {
          $lookup: {
            from: 'webusers',
            let: {
              userId: {
                $cond: {
                  if: { $and: ['$linkedUserId', { $ne: ['$linkedUserId', ''] }] },
                  then: { $toObjectId: '$linkedUserId' },
                  else: null
                }
              }
            },
            pipeline: [
              { $match: { $expr: { $and: [{ $ne: ['$$userId', null] }, { $eq: ['$_id', '$$userId'] }] } } },
              {
                $project: {
                  'profile.firstName': 1,
                  'profile.lastName': 1,
                  'profile.alias': 1,
                  email: 1,
                  role: 1,   // ← Legacy field (backward compatibility)
                  roles: 1   // ← New array field
                }
              }
            ],
            as: 'webUser'
          }
        },

        // 4. Proyección final
        {
          $project: {
            driverName: '$_id',
            totalSessions: { $size: '$totalSessions' },
            totalLaps: 1,
            bestPosition: 1,
            bestTime: 1,
            lastRace: 1,
            firstRace: 1,
            linkedUserId: 1,
            personId: 1,
            isLinked: {
              $and: [
                { $ne: ['$linkedUserId', null] },
                { $ne: ['$linkedUserId', ''] }
              ]
            },
            webUser: { $arrayElemAt: ['$webUser', 0] },
            // Extraer nombre y apellido del driverName
            parsedName: {
              $let: {
                vars: {
                  nameParts: { $split: ['$_id', ' '] }
                },
                in: {
                  firstName: { $arrayElemAt: ['$$nameParts', 0] },
                  lastName: {
                    $cond: {
                      if: { $gt: [{ $size: '$$nameParts' }, 1] },
                      then: {
                        $reduce: {
                          input: { $slice: ['$$nameParts', 1, { $size: '$$nameParts' }] },
                          initialValue: '',
                          in: {
                            $concat: [
                              '$$value',
                              { $cond: { if: { $eq: ['$$value', ''] }, then: '', else: ' ' } },
                              '$$this'
                            ]
                          }
                        }
                      },
                      else: null
                    }
                  }
                }
              }
            }
          }
        },

        // 5. Ordenar por última carrera
        { $sort: { lastRace: -1 } }
      ]);
      
      // Si hay búsqueda, filtrar
      let filteredDrivers = drivers;
      if (search) {
        filteredDrivers = drivers.filter(driver =>
          driver.driverName.toLowerCase().includes(search.toLowerCase())
        );
      }

      // 🔍 DEBUG: Log de los primeros 3 drivers para ver estructura
      console.log('📊 Sample drivers data:', JSON.stringify(filteredDrivers.slice(0, 3), null, 2));
      console.log(`📊 Total drivers: ${filteredDrivers.length}, Linked: ${filteredDrivers.filter(d => d.isLinked).length}`);

      // 🔍 DEBUG: Log del driver vinculado específicamente
      const linkedDriver = filteredDrivers.find(d => d.isLinked);
      if (linkedDriver) {
        console.log('🔗 LINKED DRIVER DATA:', JSON.stringify(linkedDriver, null, 2));
      }

      return NextResponse.json({
        success: true,
        drivers: filteredDrivers,
        total: filteredDrivers.length
      });
    }
    
    if (action === 'search_users') {
      // Buscar usuarios registrados para linking
      const users = await WebUser.find({
        $or: [
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { 'profile.alias': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      })
      .select('profile.firstName profile.lastName profile.alias email kartingLink')
      .limit(10);
      
      return NextResponse.json({
        success: true,
        users
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error in drivers API:', error);
    return NextResponse.json(
      { error: 'Error fetching drivers data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { action, driverName, webUserId, personId, roles } = await request.json();
    
    if (action === 'link_driver' && driverName && webUserId) {
      console.log('🚨🚨🚨 CÓDIGO NUEVO CARGADO - VERSIÓN 2.0 🚨🚨🚨');
      console.log(`🔗 Linking driver "${driverName}" to user ${webUserId}`, roles ? `with roles: ${JSON.stringify(roles)}` : '');

      // Verificar que el usuario existe
      const user = await WebUser.findById(webUserId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      // 🆕 Actualizar en race_sessions_v0 (nueva estructura)
      console.log(`🔍 Buscando sesiones con driver: "${driverName}"`);
      const sessionsBeforeUpdate = await RaceSessionV0.find({ 'drivers.driverName': driverName }).limit(1);
      console.log(`🔍 Sesiones encontradas antes de actualizar: ${sessionsBeforeUpdate.length}`);
      if (sessionsBeforeUpdate.length > 0) {
        const driver = sessionsBeforeUpdate[0].drivers.find((d: any) => d.driverName === driverName);
        console.log(`🔍 Estado del driver ANTES: linkedUserId=${driver?.linkedUserId}, personId=${driver?.personId}`);
      }

      // Construir el objeto $set dinámicamente (sin undefined)
      const setFields: any = {
        'drivers.$[elem].linkedUserId': webUserId
      };
      if (personId) {
        setFields['drivers.$[elem].personId'] = personId;
      }

      console.log(`🔧 webUserId a guardar: "${webUserId}" (type: ${typeof webUserId})`);
      console.log(`🔧 setFields:`, JSON.stringify(setFields, null, 2));

      // Agregar timestamp manualmente para evitar conflicto con Mongoose
      setFields['updatedAt'] = new Date();

      // Usar la colección directa de MongoDB en vez del modelo de Mongoose
      // para evitar que Mongoose sobrescriba nuestro $set
      const updateResult = await RaceSessionV0.collection.updateMany(
        { 'drivers.driverName': driverName },
        { $set: setFields },
        {
          arrayFilters: [{ 'elem.driverName': driverName }]
        }
      );

      console.log(`✅ UpdateMany result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);

      // Verificar después de actualizar
      const sessionsAfterUpdate = await RaceSessionV0.find({ 'drivers.driverName': driverName }).limit(1);
      if (sessionsAfterUpdate.length > 0) {
        const driver = sessionsAfterUpdate[0].drivers.find((d: any) => d.driverName === driverName);
        console.log(`🔍 Estado del driver DESPUÉS: linkedUserId=${driver?.linkedUserId}, personId=${driver?.personId}`);
        console.log(`🔍 Driver completo:`, JSON.stringify(driver, null, 2));
      }

      // Verificar que el aggregation también lo vea
      const testAgg = await RaceSessionV0.aggregate([
        { $unwind: '$drivers' },
        { $match: { 'drivers.driverName': driverName } },
        { $limit: 1 },
        { $project: { driver: '$drivers' } }
      ]);
      console.log(`🔍 Test aggregation result:`, JSON.stringify(testAgg, null, 2));

      // También actualizar en LapRecord (mantener compatibilidad)
      await LapRecord.updateMany(
        { driverName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        {
          webUserId,
          personId: personId || undefined,
          linkingConfidence: 'high',
          linkingMethod: 'manual_link'
        }
      );

      // 🆕 Determinar roles basado en selección (puede tener múltiples)
      let userRoles: string[] = [];
      if (roles) {
        if (roles.isCoach) {
          userRoles.push('coach');
        }
        if (roles.isOrganizer) {
          userRoles.push('organizer');
        }
      }
      // Si no tiene roles especiales, asignar 'user' por defecto
      if (userRoles.length === 0) {
        userRoles = ['user'];
      }

      // Determinar rol "principal" para respuesta (el de mayor jerarquía)
      const primaryRole = userRoles.includes('organizer') ? 'organizer' :
                         userRoles.includes('coach') ? 'coach' : 'user';

      // Actualizar estado del usuario + roles (migrar de role → roles)
      await WebUser.findByIdAndUpdate(webUserId, {
        $set: {
          'kartingLink.status': 'linked',
          'kartingLink.driverName': driverName,
          'kartingLink.linkedAt': new Date(),
          roles: userRoles  // ← Multiple roles
        },
        $unset: { role: 1 }  // ← Eliminar campo legacy
      });
      
      // Crear o actualizar identidad del corredor
      await DriverIdentity.findOneAndUpdate(
        { 
          $or: [
            { webUserId },
            { primaryName: { $regex: new RegExp(`^${driverName}$`, 'i') } }
          ]
        },
        {
          webUserId,
          personId: personId || undefined,
          primaryName: driverName,
          linkingStatus: 'confirmed',
          confidence: 100,
          manuallyVerified: true,
          verificationDate: new Date(),
          $push: {
            nameHistory: {
              name: driverName,
              firstSeen: new Date(),
              lastSeen: new Date(),
              sessionCount: 0,
              confidence: 'confirmed',
              source: 'manual_entry'
            }
          }
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Driver linked: ${driverName} -> ${user.email} (${updateResult.modifiedCount} V0 sessions updated, roles: ${userRoles.join(', ')})`);

      return NextResponse.json({
        success: true,
        message: `Driver ${driverName} linked to ${user.email}${userRoles.length > 0 ? ` with roles: ${userRoles.join(', ')}` : ''}`,
        recordsUpdated: updateResult.modifiedCount,
        assignedRole: primaryRole,
        assignedRoles: userRoles
      });
    }
    
    if (action === 'unlink_driver' && driverName) {
      console.log(`🔓 Unlinking driver "${driverName}"`);

      // 1️⃣ Buscar el WebUser vinculado a este driver
      const aggregationResult = await RaceSessionV0.aggregate([
        { $unwind: '$drivers' },
        { $match: {
          'drivers.driverName': driverName,
          'drivers.linkedUserId': { $exists: true, $ne: null }
        }},
        { $limit: 1 },
        { $project: { 'drivers.linkedUserId': 1 } }
      ]);

      let webUserId = null;
      if (aggregationResult.length > 0 && aggregationResult[0].drivers?.linkedUserId) {
        webUserId = aggregationResult[0].drivers.linkedUserId;
        console.log(`🔍 Found linked user: ${webUserId}`);
      } else {
        console.log(`⚠️ No linked user found for driver: ${driverName}`);
      }

      // 2️⃣ Desvincular el WebUser (limpiar kartingLink)
      if (webUserId) {
        await WebUser.findByIdAndUpdate(webUserId, {
          $set: {
            'kartingLink.status': 'pending_first_race',
            'kartingLink.driverName': null,
            'kartingLink.linkedAt': null
          }
        });
        console.log(`✅ WebUser ${webUserId} unlinked from driver`);
      }

      // 3️⃣ Remover linking de race_sessions_v0 para TODOS los pilotos de este usuario
      // No solo el driverName específico, sino todos los que tengan este linkedUserId
      const collection = RaceSessionV0.collection;

      const updateResult = await collection.updateMany(
        { 'drivers.linkedUserId': webUserId },
        {
          $unset: {
            'drivers.$[elem].linkedUserId': '',
            'drivers.$[elem].personId': ''
          }
        },
        {
          arrayFilters: [{ 'elem.linkedUserId': webUserId }]
        }
      );

      console.log(`✅ Removed linkedUserId from ${updateResult.modifiedCount} sessions for all driver names`);

      // 4️⃣ También remover de LapRecord (compatibilidad)
      await LapRecord.updateMany(
        { driverName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        {
          $unset: {
            webUserId: 1,
            personId: 1
          },
          linkingConfidence: 'low',
          linkingMethod: 'exact_match'
        }
      );

      // 5️⃣ Actualizar identidad del corredor
      await DriverIdentity.findOneAndUpdate(
        { primaryName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        {
          $unset: { webUserId: 1 },
          linkingStatus: 'unlinked',
          confidence: 20,
          manuallyVerified: false
        }
      );

      console.log(`✅ Driver unlinked: ${driverName} (${updateResult.modifiedCount} records updated)`);

      return NextResponse.json({
        success: true,
        message: `Driver ${driverName} desvinculado exitosamente`,
        recordsUpdated: updateResult.modifiedCount,
        webUserUnlinked: !!webUserId
      });
    }

    if (action === 'update_roles' && webUserId && roles) {
      console.log(`🎯 Updating roles for user ${webUserId}:`, roles);

      // Verificar que el usuario existe
      const user = await WebUser.findById(webUserId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      // Determinar roles basado en selección (puede tener múltiples)
      let userRoles: string[] = [];
      if (roles.isCoach) {
        userRoles.push('coach');
      }
      if (roles.isOrganizer) {
        userRoles.push('organizer');
      }
      // Si no tiene roles especiales, asignar 'user' por defecto
      if (userRoles.length === 0) {
        userRoles = ['user'];
      }

      // Determinar rol "principal" para respuesta (el de mayor jerarquía)
      const primaryRole = userRoles.includes('organizer') ? 'organizer' :
                         userRoles.includes('coach') ? 'coach' : 'user';

      // Preparar actualización del usuario
      const updateData: any = {
        $set: { roles: userRoles },
        $unset: { role: 1 }  // ← Eliminar campo legacy
      };

      // Si es organizador, habilitar permisos completos
      if (userRoles.includes('organizer')) {
        updateData.$set['organizerProfile.permissions.canCreateChampionships'] = true;
        updateData.$set['organizerProfile.permissions.canApproveSquadrons'] = true;
        updateData.$set['organizerProfile.permissions.canLinkRaces'] = true;
        updateData.$set['organizerProfile.permissions.canModifyStandings'] = true;
      } else {
        // Si NO es organizador, remover todos los permisos de organizador
        updateData.$set['organizerProfile.permissions.canCreateChampionships'] = false;
        updateData.$set['organizerProfile.permissions.canApproveSquadrons'] = false;
        updateData.$set['organizerProfile.permissions.canLinkRaces'] = false;
        updateData.$set['organizerProfile.permissions.canModifyStandings'] = false;
      }

      // Actualizar roles del usuario + permisos de organizador
      const updateResult = await WebUser.findByIdAndUpdate(
        webUserId,
        updateData,
        { new: true }  // ← Devolver documento actualizado
      );

      console.log(`✅ Roles updated for ${user.email}: ${userRoles.join(', ')}`);
      console.log(`🔍 User after update:`, JSON.stringify({
        _id: updateResult?._id,
        email: updateResult?.email,
        role: (updateResult as any)?.role,
        roles: (updateResult as any)?.roles,
        organizerPermissions: (updateResult as any)?.organizerProfile?.permissions
      }, null, 2));

      return NextResponse.json({
        success: true,
        message: `Roles actualizados para ${user.email}`,
        assignedRole: primaryRole,
        assignedRoles: userRoles
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error in drivers POST:', error);
    return NextResponse.json(
      { error: 'Error processing driver linking' },
      { status: 500 }
    );
  }
}