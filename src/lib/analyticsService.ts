import connectDB from './mongodb';
import UserActivity from '@/models/UserActivity';
import WebUser from '@/models/WebUser';

export class AnalyticsService {
  /**
   * Get users online in the last 5 minutes
   */
  static async getOnlineUsers() {
    try {
      await connectDB();

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Get unique sessions active in last 5 minutes
      const activeSessions = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: fiveMinutesAgo }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$sessionId',
            userId: { $first: '$userId' },
            isAuthenticated: { $first: '$isAuthenticated' },
            ipAddress: { $first: '$ipAddress' },
            userAgent: { $first: '$userAgent' },
            lastPage: { $first: '$page' },
            lastActivity: { $first: '$timestamp' },
            geolocation: { $first: '$geolocation' }
          }
        }
      ]);

      // Get user details for authenticated sessions
      const userIds = activeSessions
        .filter(s => s.userId)
        .map(s => s.userId);

      const users = await WebUser.find({
        _id: { $in: userIds }
      }).select('profile.firstName profile.lastName profile.alias email').lean();

      const userMap = new Map(users.map(u => [u._id.toString(), u]));

      // Combine session data with user data
      const onlineUsers = activeSessions.map(session => ({
        sessionId: session._id,
        userId: session.userId?.toString() || null,
        isAuthenticated: session.isAuthenticated,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastPage: session.lastPage,
        lastActivity: session.lastActivity,
        geolocation: session.geolocation || {},
        user: session.userId ? userMap.get(session.userId.toString()) : null
      }));

      return {
        total: onlineUsers.length,
        authenticated: onlineUsers.filter(u => u.isAuthenticated).length,
        anonymous: onlineUsers.filter(u => !u.isAuthenticated).length,
        users: onlineUsers
      };

    } catch (error) {
      console.error('❌ Error getting online users:', error);
      throw error;
    }
  }

  /**
   * Get activity stats for last 24 hours
   */
  static async getActivityStats() {
    try {
      await connectDB();

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Total page views
      const totalPageViews = await UserActivity.countDocuments({
        timestamp: { $gte: twentyFourHoursAgo },
        action: 'page_view'
      });

      // Unique visitors (unique IPs)
      const uniqueVisitors = await UserActivity.distinct('ipAddress', {
        timestamp: { $gte: twentyFourHoursAgo }
      });

      // Page views by hour
      const hourlyActivity = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: twentyFourHoursAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d %H:00',
                date: '$timestamp',
                timezone: 'America/Santiago'
              }
            },
            count: { $sum: 1 },
            authenticated: {
              $sum: { $cond: ['$isAuthenticated', 1, 0] }
            },
            anonymous: {
              $sum: { $cond: ['$isAuthenticated', 0, 1] }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Most visited pages
      const topPages = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: twentyFourHoursAgo },
            action: 'page_view'
          }
        },
        {
          $group: {
            _id: '$page',
            count: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$ipAddress' }
          }
        },
        {
          $project: {
            page: '$_id',
            views: '$count',
            uniqueVisitors: { $size: '$uniqueVisitors' }
          }
        },
        {
          $sort: { views: -1 }
        },
        {
          $limit: 10
        }
      ]);

      // Average session duration
      const sessionDurations = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: twentyFourHoursAgo }
          }
        },
        {
          $group: {
            _id: '$sessionId',
            firstActivity: { $min: '$timestamp' },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $project: {
            duration: {
              $subtract: ['$lastActivity', '$firstActivity']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' }
          }
        }
      ]);

      const avgSessionMinutes = sessionDurations[0]
        ? Math.round(sessionDurations[0].avgDuration / 60000)
        : 0;

      return {
        totalPageViews,
        uniqueVisitors: uniqueVisitors.length,
        hourlyActivity,
        topPages,
        avgSessionMinutes
      };

    } catch (error) {
      console.error('❌ Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Get active IPs with authentication status
   */
  static async getActiveIPs() {
    try {
      await connectDB();

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const activeIPs = await UserActivity.aggregate([
        {
          $match: {
            timestamp: { $gte: fiveMinutesAgo }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$ipAddress',
            isAuthenticated: { $first: '$isAuthenticated' },
            userId: { $first: '$userId' },
            userAgent: { $first: '$userAgent' },
            lastActivity: { $first: '$timestamp' },
            lastPage: { $first: '$page' },
            geolocation: { $first: '$geolocation' },
            pageViews: { $sum: 1 }
          }
        },
        {
          $sort: { lastActivity: -1 }
        }
      ]);

      // Get user details for authenticated IPs
      const userIds = activeIPs
        .filter(ip => ip.userId)
        .map(ip => ip.userId);

      const users = await WebUser.find({
        _id: { $in: userIds }
      }).select('profile.firstName profile.lastName email').lean();

      const userMap = new Map(users.map(u => [u._id.toString(), u]));

      return activeIPs.map(ip => ({
        ipAddress: ip._id,
        isAuthenticated: ip.isAuthenticated,
        userId: ip.userId?.toString() || null,
        userAgent: ip.userAgent,
        lastActivity: ip.lastActivity,
        lastPage: ip.lastPage,
        geolocation: ip.geolocation || {},
        pageViews: ip.pageViews,
        user: ip.userId ? userMap.get(ip.userId.toString()) : null
      }));

    } catch (error) {
      console.error('❌ Error getting active IPs:', error);
      throw error;
    }
  }

  /**
   * Get conversion metrics
   */
  static async getConversionMetrics() {
    try {
      await connectDB();

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Total unique visitors
      const totalVisitors = await UserActivity.distinct('ipAddress', {
        timestamp: { $gte: twentyFourHoursAgo }
      });

      // New registrations in last 24h
      const newRegistrations = await WebUser.countDocuments({
        createdAt: { $gte: twentyFourHoursAgo }
      });

      // Login events in last 24h
      const loginEvents = await UserActivity.countDocuments({
        timestamp: { $gte: twentyFourHoursAgo },
        action: 'login'
      });

      const conversionRate = totalVisitors.length > 0
        ? ((newRegistrations / totalVisitors.length) * 100).toFixed(2)
        : '0.00';

      return {
        totalVisitors: totalVisitors.length,
        newRegistrations,
        loginEvents,
        conversionRate: parseFloat(conversionRate)
      };

    } catch (error) {
      console.error('❌ Error getting conversion metrics:', error);
      throw error;
    }
  }
}

export default AnalyticsService;
