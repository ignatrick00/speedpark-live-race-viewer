import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/adminAuth';
import AnalyticsService from '@/lib/analyticsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics
 * Get real-time analytics and activity stats (Admin only)
 */
export async function GET(request: NextRequest) {
  // Check admin access
  const adminCheck = await verifyAdminAccess(request);

  if (!adminCheck.isValid) {
    return NextResponse.json(
      {
        error: 'Access denied. Admin privileges required.',
        details: adminCheck.error
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'online', 'activity', 'ips', 'conversion', 'all'

    // Mode: online users
    if (mode === 'online') {
      const onlineUsers = await AnalyticsService.getOnlineUsers();
      return NextResponse.json({
        success: true,
        data: onlineUsers
      });
    }

    // Mode: activity stats
    if (mode === 'activity') {
      const activityStats = await AnalyticsService.getActivityStats();
      return NextResponse.json({
        success: true,
        data: activityStats
      });
    }

    // Mode: active IPs
    if (mode === 'ips') {
      const activeIPs = await AnalyticsService.getActiveIPs();
      return NextResponse.json({
        success: true,
        data: activeIPs
      });
    }

    // Mode: conversion metrics
    if (mode === 'conversion') {
      const conversionMetrics = await AnalyticsService.getConversionMetrics();
      return NextResponse.json({
        success: true,
        data: conversionMetrics
      });
    }

    // Default: return all data
    const [onlineUsers, activityStats, activeIPs, conversionMetrics] = await Promise.all([
      AnalyticsService.getOnlineUsers(),
      AnalyticsService.getActivityStats(),
      AnalyticsService.getActiveIPs(),
      AnalyticsService.getConversionMetrics()
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        onlineUsers,
        activityStats,
        activeIPs,
        conversionMetrics
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN ANALYTICS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
