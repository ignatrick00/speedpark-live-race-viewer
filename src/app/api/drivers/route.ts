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
      // 🆕 Obtener corredores desde race_sessions_v0 (sin linkedUserId - SINGLE SOURCE OF TRUTH)
      const drivers = await RaceSessionV0.aggregate([
        // 1. Descomponer array de drivers
        { $unwind: '$drivers' },

        // 2. Ordenar por fecha descendente (más reciente primero)
        { $sort: { sessionDate: -1 } },

        // 3. Agrupar por nombre de driver (stats solo)
        {
          $group: {
            _id: '$drivers.driverName',
            totalSessions: { $addToSet: '$sessionId' },
            totalLaps: { $sum: '$drivers.totalLaps' },
            bestPosition: { $min: '$drivers.finalPosition' },
            bestTime: { $min: { $cond: [{ $gt: ['$drivers.bestTime', 0] }, '$drivers.bestTime', null] } },
            lastRace: { $max: '$sessionDate' },
            firstRace: { $min: '$sessionDate' }
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

      // 🔗 Buscar vinculación en WebUser (SINGLE SOURCE OF TRUTH)
      const driverNames = drivers.map(d => d.driverName);

      // Buscar TODOS los usuarios vinculados (sin filtro de nombres)
      const allLinkedUsers = await WebUser.find({
        'kartingLink.status': 'linked',
        'kartingLink.driverName': { $exists: true, $ne: null }
      }).select('_id profile.firstName profile.lastName profile.alias email roles kartingLink').lean();

      console.log(`🔍 [DRIVERS] Total linked users in DB: ${allLinkedUsers.length}`);
      if (allLinkedUsers.length > 0) {
        console.log(`🔍 [DRIVERS] Sample linked user:`, JSON.stringify(allLinkedUsers[0], null, 2));
      }

      // Filtrar solo los que matchean con nuestros drivers (case-insensitive)
      const driverNamesLower = new Set(driverNames.map(n => n.toLowerCase()));
      const linkedUsers = allLinkedUsers.filter((user: any) =>
        user.kartingLink?.driverName &&
        driverNamesLower.has(user.kartingLink.driverName.toLowerCase())
      );

      console.log(`🔍 [DRIVERS] Matched ${linkedUsers.length} linked users with driver list`);

      // Crear mapa de driverName -> webUser (case-insensitive)
      const driverToUserMap = new Map();
      linkedUsers.forEach((user: any) => {
        if (user.kartingLink?.driverName) {
          const linkInfo = {
            linkedUserId: user._id.toString(),
            webUser: {
              _id: user._id,
              profile: user.profile,
              email: user.email,
              roles: user.roles
            }
          };
          driverToUserMap.set(user.kartingLink.driverName.toLowerCase(), linkInfo);
          console.log(`   ✓ Mapped: "${user.kartingLink.driverName}" -> ${user.email}`);
        }
      });

      // Agregar información de vinculación a cada driver
      const driversWithLinking = drivers.map(driver => {
        const linkInfo = driverToUserMap.get(driver.driverName.toLowerCase());
        return {
          ...driver,
          linkedUserId: linkInfo?.linkedUserId || null,
          personId: null, // No longer used
          isLinked: !!linkInfo,
          webUser: linkInfo?.webUser || null
        };
      });
      
      // Si hay búsqueda, filtrar
      let filteredDrivers = driversWithLinking;
      if (search) {
        filteredDrivers = driversWithLinking.filter(driver =>
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
      console.log(`🔗 [LINK-DRIVER] Linking "${driverName}" to user ${webUserId}`);

      // Verificar que el usuario existe
      const user = await WebUser.findById(webUserId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      // Verificar que el driverName existe en race_sessions_v0
      const driverExists = await RaceSessionV0.findOne({ 'drivers.driverName': driverName }).lean();
      if (!driverExists) {
        return NextResponse.json(
          { error: `No se encontraron carreras para el piloto "${driverName}"` },
          { status: 404 }
        );
      }

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
      // IMPORTANTE: Primero limpiar speedParkProfile.driverName si existe, luego establecer kartingLink.driverName
      const updatedUser = await WebUser.findByIdAndUpdate(webUserId, {
        $set: {
          'kartingLink.status': 'linked',
          'kartingLink.driverName': driverName, // ← En el nivel correcto
          'kartingLink.linkedAt': new Date(),
          roles: userRoles  // ← Multiple roles
        },
        $unset: {
          role: 1,  // ← Eliminar campo legacy
          'kartingLink.speedParkProfile.driverName': 1  // ← Limpiar driverName de speedParkProfile
        }
      }, { new: true });

      console.log(`✅ [LINK-DRIVER] Success: ${driverName} -> ${user.email} (roles: ${userRoles.join(', ')})`);
      console.log(`🔍 [LINK-DRIVER] Verificación - kartingLink guardado:`, JSON.stringify(updatedUser?.kartingLink, null, 2));

      return NextResponse.json({
        success: true,
        message: `Driver ${driverName} vinculado a ${user.email}${userRoles.length > 0 ? ` con roles: ${userRoles.join(', ')}` : ''}`,
        assignedRole: primaryRole,
        assignedRoles: userRoles
      });
    }
    
    if (action === 'unlink_driver' && driverName) {
      console.log(`🔓 [UNLINK-DRIVER] Unlinking driver "${driverName}"`);

      // Buscar el WebUser vinculado a este driverName
      const user = await WebUser.findOne({
        'kartingLink.driverName': driverName,
        'kartingLink.status': 'linked'
      });

      if (!user) {
        return NextResponse.json(
          { error: `No se encontró usuario vinculado a "${driverName}"` },
          { status: 404 }
        );
      }

      // Limpiar kartingLink del WebUser
      await WebUser.findByIdAndUpdate(user._id, {
        $set: {
          'kartingLink.status': 'pending_first_race',
          'kartingLink.driverName': null,
          'kartingLink.linkedAt': null
        }
      });

      console.log(`✅ [UNLINK-DRIVER] Success: ${driverName} unlinked from ${user.email}`);

      return NextResponse.json({
        success: true,
        message: `Driver ${driverName} desvinculado exitosamente de ${user.email}`,
        webUserUnlinked: true
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