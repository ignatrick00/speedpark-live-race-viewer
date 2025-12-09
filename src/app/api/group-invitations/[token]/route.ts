import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import GroupClassInvitation from '@/models/GroupClassInvitation';
import TrainingClass from '@/models/TrainingClass';
import WebUser from '@/models/WebUser';

// GET - Get invitation details by token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();

    const { token } = params;

    // Find invitation by token
    const invitation = await GroupClassInvitation.findOne({ token })
      .populate('classId')
      .populate('inviterId', 'profile');

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      if (invitation.status === 'pending') {
        invitation.status = 'expired';
        await invitation.save();
      }
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 } // 410 Gone
      );
    }

    // Check if invitation has already been responded to
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    const trainingClass = invitation.classId as any;

    // Return invitation details
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation._id,
        inviterName: invitation.inviterName,
        inviteeEmail: invitation.inviteeEmail,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        class: {
          id: trainingClass._id,
          coachName: trainingClass.coachName,
          date: trainingClass.date,
          startTime: trainingClass.startTime,
          endTime: trainingClass.endTime,
          groupPricePerPerson: trainingClass.groupPricePerPerson,
          currentParticipants: trainingClass.groupBookings.length,
          maxCapacity: trainingClass.maxGroupCapacity,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Accept or reject invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await connectDB();

    const { token } = params;
    const body = await request.json();
    const { action } = body; // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    // Get user from token if provided
    const authHeader = request.headers.get('authorization');
    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authToken = authHeader.substring(7);
      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET!) as {
          userId: string;
          email: string;
        };
        user = await WebUser.findById(decoded.userId);
      } catch (err) {
        // Invalid token, continue without user
      }
    }

    // Find invitation by token
    const invitation = await GroupClassInvitation.findOne({ token });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Check if invitation has already been responded to
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    // If rejecting
    if (action === 'reject') {
      invitation.status = 'rejected';
      invitation.respondedAt = new Date();
      await invitation.save();

      return NextResponse.json({
        success: true,
        message: 'Invitation rejected',
      });
    }

    // If accepting, user must be logged in
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to accept this invitation' },
        { status: 401 }
      );
    }

    // Verify user email matches invitation
    if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Find the training class
    const trainingClass = await TrainingClass.findById(invitation.classId);
    if (!trainingClass) {
      return NextResponse.json(
        { error: 'Training class not found' },
        { status: 404 }
      );
    }

    // Check if class still has capacity
    if (trainingClass.groupBookings.length >= trainingClass.maxGroupCapacity) {
      invitation.status = 'expired';
      await invitation.save();
      return NextResponse.json(
        { error: 'This class is now full' },
        { status: 400 }
      );
    }

    // Check if user is already in the group
    const alreadyBooked = trainingClass.groupBookings.some(
      (booking) => booking.studentId.toString() === user._id.toString()
    );

    if (alreadyBooked) {
      return NextResponse.json(
        { error: 'You are already part of this group class' },
        { status: 400 }
      );
    }

    // Add user to group bookings
    const studentName = `${user.profile.firstName} ${user.profile.lastName}`;

    trainingClass.groupBookings.push({
      studentId: user._id,
      studentName,
      bookedAt: new Date(),
      status: 'confirmed',
      whatsappNumber: user.profile.whatsappNumber || '',
    } as any);

    trainingClass.updateStatus();
    await trainingClass.save();

    // Update invitation
    invitation.status = 'accepted';
    invitation.inviteeId = user._id;
    invitation.inviteeName = studentName;
    invitation.respondedAt = new Date();
    await invitation.save();

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted! You have been added to the group class',
      booking: {
        classId: trainingClass._id,
        studentName,
        price: trainingClass.groupPricePerPerson,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
