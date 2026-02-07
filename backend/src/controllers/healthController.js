const db = require('../config/database');
const os = require('os');

class HealthController {
  
  /**
   * Check system health
   * GET /api/health
   */
  static async getHealth(req, res) {
    try {
      const startTime = Date.now();
      
      // Check database connection
      let dbStatus = 'unknown';
      let dbResponseTime = 0;
      try {
        const dbStart = Date.now();
        await db.query('SELECT 1');
        dbResponseTime = Date.now() - dbStart;
        dbStatus = 'connected';
      } catch (dbError) {
        dbStatus = 'disconnected';
      }
      
      // Get system information
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        node_version: process.version,
        memory_usage: `${Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)}%`,
        uptime: this.formatUptime(process.uptime()),
        load_average: os.loadavg(),
        cpu_count: os.cpus().length
      };
      
      // Get application statistics
      const appStats = await this.getApplicationStats();
      
      const healthCheck = {
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        service: "Healthcare Management System API",
        version: process.env.APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        checks: {
          database: {
            status: dbStatus,
            response_time_ms: dbResponseTime
          },
          memory: {
            status: systemInfo.memory_usage.includes('>90') ? 'warning' : 'ok',
            usage: systemInfo.memory_usage
          }
        },
        system: systemInfo,
        statistics: appStats,
        response_time_ms: Date.now() - startTime
      };
      
      return res.json(healthCheck);
      
    } catch (error) {
      console.error('Health Check Error:', error);
      
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: "Healthcare Management System API",
        error: "Internal server error during health check"
      });
    }
  }
  
  /**
   * Format uptime in human-readable format
   */
  static formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }
  
  /**
   * Get application statistics
   */
  static async getApplicationStats() {
    try {
      // Get counts from all major tables
      const [
        usersResult,
        patientsResult,
        appointmentsResult,
        billsResult,
        medicalRecordsResult
      ] = await Promise.all([
        db.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE'),
        db.query('SELECT COUNT(*) FROM patients'),
        db.query('SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) = CURRENT_DATE'),
        db.query('SELECT COUNT(*) FROM bills WHERE payment_status = \'paid\' AND DATE(created_at) = CURRENT_DATE'),
        db.query('SELECT COUNT(*) FROM medical_records WHERE DATE(created_at) = CURRENT_DATE')
      ]);
      
      return {
        active_users: parseInt(usersResult.rows[0].count),
        total_patients: parseInt(patientsResult.rows[0].count),
        todays_appointments: parseInt(appointmentsResult.rows[0].count),
        todays_paid_bills: parseInt(billsResult.rows[0].count),
        todays_medical_records: parseInt(medicalRecordsResult.rows[0].count)
      };
    } catch (error) {
      console.error('Get Application Stats Error:', error);
      return { error: "Failed to fetch application statistics" };
    }
  }
  
  /**
   * Test database connection
   * GET /api/test-db
   */
  static async testDatabase(req, res) {
    try {
      const startTime = Date.now();
      
      // Test query
      const result = await db.query('SELECT version(), NOW() as server_time, CURRENT_USER as current_user');
      
      const responseTime = Date.now() - startTime;
      
      return res.json({
        success: true,
        message: "Database connected successfully",
        data: {
          version: result.rows[0].version.split('\n')[0],
          server_time: result.rows[0].server_time,
          current_user: result.rows[0].current_user,
          response_time_ms: responseTime
        },
        time: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Test Database Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Database connection failed",
        message: error.message,
        time: new Date().toISOString()
      });
    }
  }
  
  /**
   * Get system metrics for monitoring
   * GET /api/metrics
   */
  static async getMetrics(req, res) {
    try {
      // Get system metrics
      const systemMetrics = {
        cpu: {
          load_1min: os.loadavg()[0],
          load_5min: os.loadavg()[1],
          load_15min: os.loadavg()[2],
          cores: os.cpus().length
        },
        memory: {
          total_mb: Math.round(os.totalmem() / 1024 / 1024),
          free_mb: Math.round(os.freemem() / 1024 / 1024),
          used_mb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
          usage_percent: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)
        },
        disk: {
          // Note: In production, you'd use a library like diskusage
          total_gb: 'N/A',
          free_gb: 'N/A',
          usage_percent: 'N/A'
        }
      };
      
      // Get database metrics
      const dbMetrics = await this.getDatabaseMetrics();
      
      // Get application metrics
      const appMetrics = await this.getApplicationMetrics();
      
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        database: dbMetrics,
        application: appMetrics
      });
      
    } catch (error) {
      console.error('Get Metrics Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch system metrics"
      });
    }
  }
  
  /**
   * Get database metrics
   */
  static async getDatabaseMetrics() {
    try {
      // Get database size (PostgreSQL specific)
      const sizeResult = await db.query(`
        SELECT 
          pg_database_size(current_database()) as db_size_bytes,
          pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
      `);
      
      // Get table sizes
      const tableSizesResult = await db.query(`
        SELECT 
          schemaname as schema,
          tablename as table,
          pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
          pg_total_relation_size(schemaname || '.' || tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
        LIMIT 10
      `);
      
      // Get connection count
      const connectionsResult = await db.query(`
        SELECT COUNT(*) as connection_count
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      return {
        database_size: sizeResult.rows[0].db_size_pretty,
        connection_count: parseInt(connectionsResult.rows[0].connection_count),
        largest_tables: tableSizesResult.rows.map(row => ({
          table: row.table,
          size: row.size,
          size_bytes: parseInt(row.size_bytes)
        }))
      };
    } catch (error) {
      console.error('Get Database Metrics Error:', error);
      return { error: "Failed to fetch database metrics" };
    }
  }
  
  /**
   * Get application metrics
   */
  static async getApplicationMetrics() {
    try {
      // Get request counts (mock - in production, you'd track this)
      const requestCounts = {
        total_requests: 0,
        requests_per_minute: 0,
        error_rate: 0
      };
      
      // Get cache statistics (mock)
      const cacheStats = {
        hit_rate: 0,
        miss_rate: 0,
        size: 0
      };
      
      // Get queue lengths (mock)
      const queueStats = {
        appointment_queue: 0,
        billing_queue: 0,
        notification_queue: 0
      };
      
      return {
        requests: requestCounts,
        cache: cacheStats,
        queues: queueStats,
        uptime: this.formatUptime(process.uptime())
      };
    } catch (error) {
      console.error('Get Application Metrics Error:', error);
      return { error: "Failed to fetch application metrics" };
    }
  }
  
  /**
   * Ping endpoint for load balancers
   * GET /api/ping
   */
  static async ping(req, res) {
    try {
      // Simple database check
      await db.query('SELECT 1');
      
      return res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'HMS API',
        version: process.env.APP_VERSION || '1.0.0'
      });
      
    } catch (error) {
      return res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'HMS API',
        error: 'Service unavailable'
      });
    }
  }
  
  /**
   * Get API status
   * GET /api/status
   */
  static async getStatus(req, res) {
    try {
      const statusChecks = [];
      const startTime = Date.now();
      
      // Check database
      const dbStart = Date.now();
      try {
        await db.query('SELECT 1');
        statusChecks.push({
          service: 'database',
          status: 'healthy',
          response_time_ms: Date.now() - dbStart
        });
      } catch (dbError) {
        statusChecks.push({
          service: 'database',
          status: 'unhealthy',
          error: dbError.message
        });
      }
      
      // Check external services (mock)
      statusChecks.push({
        service: 'payment_gateway',
        status: 'healthy',
        response_time_ms: 50
      });
      
      statusChecks.push({
        service: 'email_service',
        status: 'healthy', 
        response_time_ms: 30
      });
      
      // Determine overall status
      const allHealthy = statusChecks.every(check => check.status === 'healthy');
      
      return res.json({
        status: allHealthy ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: statusChecks,
        response_time_ms: Date.now() - startTime,
        uptime: this.formatUptime(process.uptime())
      });
      
    } catch (error) {
      console.error('Get Status Error:', error);
      
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: "Failed to check system status"
      });
    }
  }
}

module.exports = HealthController;