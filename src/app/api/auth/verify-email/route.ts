import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/verificacion-email?error=invalid_token', request.url)
      );
    }

    // Find user with this verification token
    const user = await WebUser.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/verificacion-email?error=invalid_token', request.url)
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.redirect(
        new URL('/verificacion-email?status=already_verified', request.url)
      );
    }

    // Check token expiration (24 hours)
    const tokenAge = Date.now() - new Date(user.emailVerificationSentAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (tokenAge > twentyFourHours) {
      return NextResponse.redirect(
        new URL('/verificacion-email?error=expired_token', request.url)
      );
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationSentAt = undefined;
    await user.save();

    console.log(`✅ Email verified for user: ${user.email}`);

    // Generate JWT token for auto-login after verification
    const authToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Redirect to success page with token
    const redirectUrl = new URL('/verificacion-email', request.url);
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('token', authToken);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/verificacion-email?error=server_error', request.url)
    );
  }
}
