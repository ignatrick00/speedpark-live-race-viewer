import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Reserva from '@/models/Reserva';
import ClaseBloque from '@/models/ClaseBloque';
import WebUser from '@/models/WebUser';

export async function GET(request: NextRequest) {
  try {
    console.log('📝 GET /api/reservas - Fetching reservations');
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const claseBloqueId = searchParams.get('claseBloqueId');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    
    // Build query
    let query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (claseBloqueId) {
      query.claseBloqueId = claseBloqueId;
    }
    
    if (status && status !== 'all') {
      query.bookingStatus = status;
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      query['payment.status'] = paymentStatus;
    }
    
    const reservas = await Reserva.find(query)
      .populate('userId', 'email profile')
      .populate({
        path: 'claseBloqueId',
        populate: {
          path: 'instructorId',
          select: 'name email'
        }
      })
      .sort({ bookedAt: -1 });
    
    console.log(`✅ Found ${reservas.length} reservations`);
    
    return NextResponse.json({
      success: true,
      reservas,
      timestamp: new Date().toISOString(),
      total: reservas.length,
      query: {
        userId,
        claseBloqueId,
        status,
        paymentStatus
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching reservations:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching reservations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/reservas - Creating reservation');
    
    await connectDB();
    
    const body = await request.json();
    const {
      userId,
      claseBloqueId,
      spotsReserved = 1,
      studentInfo,
      specialRequirements,
      notes
    } = body;
    
    // Validate required fields
    if (!userId || !claseBloqueId || !studentInfo?.name) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          required: ['userId', 'claseBloqueId', 'studentInfo.name']
        },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }
    
    // Verify class block exists and is available
    const claseBloque = await ClaseBloque.findById(claseBloqueId).populate('instructorId', 'name');
    if (!claseBloque) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Class block not found'
        },
        { status: 404 }
      );
    }
    
    // Check if class can accept the reservation
    if (!claseBloque.canAcceptBookings(spotsReserved)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Class is not available or fully booked',
          details: {
            status: claseBloque.status,
            spotsRemaining: claseBloque.spotsRemaining,
            requestedSpots: spotsReserved
          }
        },
        { status: 409 }
      );
    }
    
    // Calculate total amount
    const totalAmount = claseBloque.pricePerPerson * spotsReserved;
    
    // Create reservation
    const reserva = new Reserva({
      userId,
      claseBloqueId,
      spotsReserved,
      totalAmount,
      studentInfo: {
        name: studentInfo.name,
        email: studentInfo.email || user.email,
        phone: studentInfo.phone,
        emergencyContact: studentInfo.emergencyContact
      },
      payment: {
        status: 'pending',
        amount: totalAmount
      },
      specialRequirements,
      notes
    });
    
    await reserva.save();
    
    // Update class block booking count
    claseBloque.addBooking(spotsReserved);
    await claseBloque.save();
    
    // Populate for response
    await reserva.populate('userId', 'email profile');
    await reserva.populate({
      path: 'claseBloqueId',
      populate: {
        path: 'instructorId',
        select: 'name email'
      }
    });
    
    console.log(`✅ Created reservation: ${reserva._id} for ${spotsReserved} spot(s)`);
    
    return NextResponse.json({
      success: true,
      reserva,
      message: 'Reservation created successfully',
      nextSteps: {
        paymentRequired: true,
        paymentAmount: totalAmount,
        paymentMethods: ['transbank', 'transfer']
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating reservation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error creating reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📝 PUT /api/reservas - Updating reservation');
    
    await connectDB();
    
    const body = await request.json();
    const {
      reservaId,
      action, // 'cancel', 'complete', 'pay', 'refund'
      paymentInfo // for pay action
    } = body;
    
    if (!reservaId || !action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          required: ['reservaId', 'action']
        },
        { status: 400 }
      );
    }
    
    const reserva = await Reserva.findById(reservaId)
      .populate('claseBloqueId');
    
    if (!reserva) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Reservation not found'
        },
        { status: 404 }
      );
    }
    
    let result = false;
    let message = '';
    
    switch (action) {
      case 'cancel':
        result = reserva.cancel();
        if (result) {
          // Update class block booking count
          const claseBloque = await ClaseBloque.findById(reserva.claseBloqueId);
          if (claseBloque) {
            claseBloque.removeBooking(reserva.spotsReserved);
            await claseBloque.save();
          }
          message = 'Reservation cancelled successfully';
        }
        break;
        
      case 'complete':
        result = reserva.complete();
        message = result ? 'Reservation completed successfully' : 'Cannot complete reservation';
        break;
        
      case 'pay':
        if (!paymentInfo?.transactionId || !paymentInfo?.method) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Payment info required for pay action',
              required: ['paymentInfo.transactionId', 'paymentInfo.method']
            },
            { status: 400 }
          );
        }
        reserva.markAsPaid(paymentInfo.transactionId, paymentInfo.method);
        result = true;
        message = 'Payment processed successfully';
        break;
        
      case 'refund':
        result = reserva.processRefund();
        message = result ? 'Refund processed successfully' : 'Cannot process refund';
        break;
        
      default:
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid action',
            validActions: ['cancel', 'complete', 'pay', 'refund']
          },
          { status: 400 }
        );
    }
    
    if (result) {
      await reserva.save();
      
      return NextResponse.json({
        success: true,
        reserva,
        message
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: `Failed to ${action} reservation`,
          currentStatus: reserva.bookingStatus,
          paymentStatus: reserva.payment.status
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error updating reservation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error updating reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}