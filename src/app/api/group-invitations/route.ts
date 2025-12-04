import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import GroupClassInvitation from '@/models/GroupClassInvitation';
import TrainingClass from '@/models/TrainingClass';
import WebUser from '@/models/WebUser';

// POST - Create a group class invitation
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No valid authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };

    // Find user (inviter)
    const inviter = await WebUser.findById(decoded.userId);
    if (!inviter) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { classId, inviteeEmail } = body;

    if (!classId || !inviteeEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, inviteeEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find the training class
    const trainingClass = await TrainingClass.findById(classId);
    if (!trainingClass) {
      return NextResponse.json(
        { error: 'Training class not found' },
        { status: 404 }
      );
    }

    // Verify inviter is part of the group
    const isInviterInGroup = trainingClass.groupBookings.some(
      (booking) => booking.studentId.toString() === inviter._id.toString()
    );

    if (!isInviterInGroup) {
      return NextResponse.json(
        { error: 'You must be part of the group class to invite others' },
        { status: 403 }
      );
    }

    // Check if class has available capacity
    const currentBookings = trainingClass.groupBookings.length;

    // Count pending invitations for this class
    const pendingInvitations = await GroupClassInvitation.countDocuments({
      classId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    const totalOccupied = currentBookings + pendingInvitations;

    if (totalOccupied >= trainingClass.maxGroupCapacity) {
      return NextResponse.json(
        { error: `Class is full (${currentBookings}/${trainingClass.maxGroupCapacity} spots taken, ${pendingInvitations} pending invitations)` },
        { status: 400 }
      );
    }

    // Check if invitee is already in the group
    const isInviteeAlreadyBooked = trainingClass.groupBookings.some(
      (booking) => booking.studentName.toLowerCase() === inviteeEmail.toLowerCase()
    );

    if (isInviteeAlreadyBooked) {
      return NextResponse.json(
        { error: 'This person is already part of the group' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await GroupClassInvitation.findOne({
      classId,
      inviteeEmail: inviteeEmail.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Check if invitee is a registered user
    const inviteeUser = await WebUser.findOne({
      email: inviteeEmail.toLowerCase()
    });

    // Generate unique token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Set expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Get inviter name
    const inviterName = inviter.profile.alias || `${inviter.profile.firstName} ${inviter.profile.lastName}`;

    // Create invitation
    const invitation = await GroupClassInvitation.create({
      classId,
      inviterId: inviter._id,
      inviterName,
      inviteeEmail: inviteeEmail.toLowerCase(),
      inviteeId: inviteeUser?._id,
      status: 'pending',
      token: invitationToken,
      expiresAt,
    });

    // TODO: Send email notification to invitee
    // For now, we'll return the invitation link

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/clases/invitations/${invitationToken}`;

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      invitation: {
        id: invitation._id,
        inviteeEmail: invitation.inviteeEmail,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        link: invitationLink,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error creating group invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
