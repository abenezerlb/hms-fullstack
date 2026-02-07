const db = require('../config/database');

class DashboardController {
  
  /**
   * Get dashboard overview statistics
   * GET /api/dashboard/overview
   */
  static async getDashboardOverview(req, res) {
    try {
      // Get current date info
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      
      // Execute all queries in parallel for better performance
      const [
        patientsResult,
        appointmentsResult,
        revenueResult,
        doctorsResult,
        bedsResult
      ] = await Promise.all([
        // Patients statistics
        db.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN DATE(created_at) = $1 THEN 1 ELSE 0 END) as new_today,
            SUM(CASE WHEN created_at >= $2 THEN 1 ELSE 0 END) as new_this_month
          FROM patients
        `, [today, startOfMonthStr]),
        
        // Appointments statistics
        db.query(`
          SELECT 
            SUM(CASE WHEN DATE(appointment_date) = $1 THEN 1 ELSE 0 END) as total_today,
            SUM(CASE WHEN DATE(appointment_date) = $1 AND status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
            SUM(CASE WHEN DATE(appointment_date) = $1 AND status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN DATE(appointment_date) = $1 AND status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
          FROM appointments
        `, [today]),
        
        // Revenue statistics
        db.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN DATE(created_at) = $1 THEN total_amount ELSE 0 END), 0) as today,
            COALESCE(SUM(CASE WHEN created_at >= $2 THEN total_amount ELSE 0 END), 0) as this_month,
            COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'partially_paid') THEN total_amount ELSE 0 END), 0) as pending
          FROM bills
        `, [today, startOfMonthStr]),
        
        // Doctors statistics
        db.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as on_leave,
            (SELECT COUNT(DISTINCT doctor_id) 
             FROM appointments 
             WHERE DATE(appointment_date) = $1 
             AND status IN ('scheduled', 'checked-in', 'in-progress')) as busy
          FROM users 
          WHERE role = 'doctor'
        `, [today]),
        
        // Beds statistics (mock data - in real app, you'd have a beds table)
        db.query(`
          SELECT 
            150 as total,
            120 as occupied,
            30 as available,
            ROUND((120.0 / 150.0) * 100, 2) as occupancy_rate
        `)
      ]);
      
      const overview = {
        patients: {
          total: parseInt(patientsResult.rows[0].total),
          new_today: parseInt(patientsResult.rows[0].new_today),
          new_this_month: parseInt(patientsResult.rows[0].new_this_month)
        },
        appointments: {
          total_today: parseInt(appointmentsResult.rows[0].total_today),
          scheduled: parseInt(appointmentsResult.rows[0].scheduled),
          completed: parseInt(appointmentsResult.rows[0].completed),
          cancelled: parseInt(appointmentsResult.rows[0].cancelled)
        },
        revenue: {
          today: parseFloat(revenueResult.rows[0].today),
          this_month: parseFloat(revenueResult.rows[0].this_month),
          pending: parseFloat(revenueResult.rows[0].pending)
        },
        doctors: {
          total: parseInt(doctorsResult.rows[0].total),
          available: parseInt(doctorsResult.rows[0].available),
          on_leave: parseInt(doctorsResult.rows[0].on_leave),
          busy: parseInt(doctorsResult.rows[0].busy)
        },
        beds: {
          total: parseInt(bedsResult.rows[0].total),
          occupied: parseInt(bedsResult.rows[0].occupied),
          available: parseInt(bedsResult.rows[0].available),
          occupancy_rate: parseFloat(bedsResult.rows[0].occupancy_rate)
        }
      };
      
      return res.json({
        success: true,
        data: overview
      });
      
    } catch (error) {
      console.error('Get Dashboard Overview Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch dashboard overview. Please try again later."
      });
    }
  }
  
  /**
   * Generate various reports
   * GET /api/dashboard/reports/:type
   */
  static async generateReport(req, res) {
    try {
      const { type } = req.params;
      const { start_date, end_date, format = 'json' } = req.query;
      
      // Set default date range if not provided
      let dateRange = {};
      if (start_date && end_date) {
        dateRange.start_date = start_date;
        dateRange.end_date = end_date;
      } else {
        // Default to current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        dateRange.start_date = firstDay.toISOString().split('T')[0];
        dateRange.end_date = lastDay.toISOString().split('T')[0];
      }
      
      let report;
      
      switch (type) {
        case 'financial':
          report = await this.generateFinancialReport(dateRange);
          break;
          
        case 'appointments':
          report = await this.generateAppointmentsReport(dateRange);
          break;
          
        case 'patients':
          report = await this.generatePatientsReport(dateRange);
          break;
          
        case 'revenue':
          report = await this.generateRevenueReport(dateRange);
          break;
          
        case 'services':
          report = await this.generateServicesReport(dateRange);
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: "Bad request",
            message: `Invalid report type '${type}'. Available types: financial, appointments, patients, revenue, services.`
          });
      }
      
      // Set report period
      report.period = `${dateRange.start_date} to ${dateRange.end_date}`;
      
      // Format response based on requested format
      if (format === 'pdf') {
        // In real app, generate PDF using library like pdfkit
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${dateRange.start_date}-${dateRange.end_date}.pdf"`);
        
        return res.json({
          success: true,
          message: "PDF generation would happen here in production",
          data: report
        });
      } else if (format === 'excel') {
        // In real app, generate Excel using library like exceljs
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${dateRange.start_date}-${dateRange.end_date}.xlsx"`);
        
        return res.json({
          success: true,
          message: "Excel generation would happen here in production",
          data: report
        });
      } else {
        // Default JSON
        return res.json({
          success: true,
          data: report
        });
      }
      
    } catch (error) {
      console.error('Generate Report Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to generate report. Please try again later."
      });
    }
  }
  
  /**
   * Generate financial report
   */
  static async generateFinancialReport(dateRange) {
    const { start_date, end_date } = dateRange;
    
    // Revenue by payment method
    const paymentMethodResult = await db.query(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_amount
      FROM bills 
      WHERE payment_status = 'paid'
      AND DATE(created_at) BETWEEN $1 AND $2
      AND payment_method IS NOT NULL
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `, [start_date, end_date]);
    
    // Revenue by service category
    const serviceCategoryResult = await db.query(`
      SELECT 
        s.category,
        COUNT(bi.id) as service_count,
        SUM(bi.subtotal) as total_revenue
      FROM bill_items bi
      JOIN services s ON bi.service_id = s.id
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.payment_status = 'paid'
      AND DATE(b.created_at) BETWEEN $1 AND $2
      AND s.category IS NOT NULL
      GROUP BY s.category
      ORDER BY total_revenue DESC
    `, [start_date, end_date]);
    
    // Daily revenue trends
    const dailyTrendsResult = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as bill_count,
        SUM(total_amount) as daily_revenue
      FROM bills 
      WHERE payment_status = 'paid'
      AND DATE(created_at) BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [start_date, end_date]);
    
    // Overall financial summary
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*) as total_bills,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN payment_status IN ('pending', 'partially_paid') THEN total_amount ELSE 0 END) as pending_revenue,
        AVG(total_amount) as average_bill_amount
      FROM bills 
      WHERE DATE(created_at) BETWEEN $1 AND $2
    `, [start_date, end_date]);
    
    return {
      report_type: "financial",
      total_revenue: parseFloat(summaryResult.rows[0].total_revenue || 0),
      total_expenses: 0, // In real app, you'd have expenses table
      net_profit: parseFloat(summaryResult.rows[0].paid_revenue || 0),
      by_payment_method: paymentMethodResult.rows.reduce((acc, row) => {
        acc[row.payment_method] = parseFloat(row.total_amount || 0);
        return acc;
      }, {}),
      by_service_category: serviceCategoryResult.rows.reduce((acc, row) => {
        acc[row.category] = parseFloat(row.total_revenue || 0);
        return acc;
      }, {}),
      daily_trends: dailyTrendsResult.rows.map(row => ({
        date: row.date,
        bill_count: parseInt(row.bill_count),
        revenue: parseFloat(row.daily_revenue || 0)
      })),
      summary: {
        total_bills: parseInt(summaryResult.rows[0].total_bills || 0),
        average_bill_amount: parseFloat(summaryResult.rows[0].average_bill_amount || 0),
        paid_revenue: parseFloat(summaryResult.rows[0].paid_revenue || 0),
        pending_revenue: parseFloat(summaryResult.rows[0].pending_revenue || 0)
      }
    };
  }
  
  /**
   * Generate appointments report
   */
  static async generateAppointmentsReport(dateRange) {
    const { start_date, end_date } = dateRange;
    
    // Appointments by status
    const statusResult = await db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage
      FROM appointments 
      WHERE DATE(appointment_date) BETWEEN $1 AND $2
      GROUP BY status
      ORDER BY count DESC
    `, [start_date, end_date]);
    
    // Appointments by doctor
    const doctorResult = await db.query(`
      SELECT 
        u.name as doctor_name,
        u.specialization,
        COUNT(a.id) as appointment_count,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
      FROM appointments a
      JOIN users u ON a.doctor_id = u.id
      WHERE DATE(a.appointment_date) BETWEEN $1 AND $2
      GROUP BY u.id, u.name, u.specialization
      ORDER BY appointment_count DESC
    `, [start_date, end_date]);
    
    // Daily appointment trends
    const dailyResult = await db.query(`
      SELECT 
        DATE(appointment_date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM appointments 
      WHERE DATE(appointment_date) BETWEEN $1 AND $2
      GROUP BY DATE(appointment_date)
      ORDER BY date
    `, [start_date, end_date]);
    
    // Wait time statistics (simplified)
    const waitTimeResult = await db.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as average_wait_minutes,
        MIN(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as min_wait_minutes,
        MAX(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as max_wait_minutes
      FROM appointments 
      WHERE status = 'completed'
      AND DATE(appointment_date) BETWEEN $1 AND $2
      AND updated_at > created_at
    `, [start_date, end_date]);
    
    return {
      report_type: "appointments",
      total_appointments: statusResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      by_status: statusResult.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage || 0)
      })),
      by_doctor: doctorResult.rows.map(row => ({
        doctor_name: row.doctor_name,
        specialization: row.specialization,
        appointment_count: parseInt(row.appointment_count),
        completed_count: parseInt(row.completed_count),
        cancelled_count: parseInt(row.cancelled_count),
        completion_rate: row.appointment_count > 0 
          ? Math.round((row.completed_count / row.appointment_count) * 100) 
          : 0
      })),
      daily_trends: dailyResult.rows.map(row => ({
        date: row.date,
        total: parseInt(row.total),
        completed: parseInt(row.completed),
        cancelled: parseInt(row.cancelled)
      })),
      wait_time: {
        average_minutes: parseFloat(waitTimeResult.rows[0].average_wait_minutes || 0),
        min_minutes: parseFloat(waitTimeResult.rows[0].min_wait_minutes || 0),
        max_minutes: parseFloat(waitTimeResult.rows[0].max_wait_minutes || 0)
      }
    };
  }
  
  /**
   * Generate patients report
   */
  static async generatePatientsReport(dateRange) {
    const { start_date, end_date } = dateRange;
    
    // New patients by date
    const newPatientsResult = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_patients,
        gender,
        COUNT(*) as count
      FROM patients 
      WHERE DATE(created_at) BETWEEN $1 AND $2
      GROUP BY DATE(created_at), gender
      ORDER BY date
    `, [start_date, end_date]);
    
    // Patient demographics
    const demographicsResult = await db.query(`
      SELECT 
        gender,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage,
        AVG(EXTRACT(YEAR FROM AGE(date_of_birth))) as average_age,
        MIN(EXTRACT(YEAR FROM AGE(date_of_birth))) as min_age,
        MAX(EXTRACT(YEAR FROM AGE(date_of_birth))) as max_age
      FROM patients 
      WHERE DATE(created_at) BETWEEN $1 AND $2
      GROUP BY gender
    `, [start_date, end_date]);
    
    // Blood type distribution
    const bloodTypeResult = await db.query(`
      SELECT 
        blood_type,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) as percentage
      FROM patients 
      WHERE DATE(created_at) BETWEEN $1 AND $2
      AND blood_type IS NOT NULL
      GROUP BY blood_type
      ORDER BY count DESC
    `, [start_date, end_date]);
    
    // Top active patients (most appointments)
    const activePatientsResult = await db.query(`
      SELECT 
        p.full_name,
        p.phone,
        p.gender,
        COUNT(a.id) as appointment_count,
        MAX(a.appointment_date) as last_visit
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id
      WHERE DATE(p.created_at) BETWEEN $1 AND $2
      GROUP BY p.id, p.full_name, p.phone, p.gender
      ORDER BY appointment_count DESC
      LIMIT 10
    `, [start_date, end_date]);
    
    return {
      report_type: "patients",
      total_new_patients: newPatientsResult.rows.reduce((sum, row) => sum + parseInt(row.new_patients), 0),
      new_patients_trend: newPatientsResult.rows
        .filter(row => row.gender === 'male' || row.gender === 'female')
        .reduce((acc, row) => {
          if (!acc[row.date]) {
            acc[row.date] = { date: row.date, male: 0, female: 0, total: 0 };
          }
          acc[row.date][row.gender] = parseInt(row.count);
          acc[row.date].total += parseInt(row.count);
          return acc;
        }, {}),
      demographics: demographicsResult.rows.map(row => ({
        gender: row.gender,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage || 0),
        average_age: parseFloat(row.average_age || 0),
        age_range: `${parseInt(row.min_age || 0)} - ${parseInt(row.max_age || 0)}`
      })),
      blood_type_distribution: bloodTypeResult.rows.map(row => ({
        blood_type: row.blood_type,
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage || 0)
      })),
      top_active_patients: activePatientsResult.rows.map(row => ({
        name: row.full_name,
        phone: row.phone,
        gender: row.gender,
        appointment_count: parseInt(row.appointment_count),
        last_visit: row.last_visit
      }))
    };
  }
  
  /**
   * Generate revenue report
   */
  static async generateRevenueReport(dateRange) {
    const financialReport = await this.generateFinancialReport(dateRange);
    
    // Add additional revenue-specific metrics
    const growthResult = await db.query(`
      WITH monthly_revenue AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(total_amount) as monthly_revenue
        FROM bills 
        WHERE payment_status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
      )
      SELECT 
        TO_CHAR(month, 'Mon YYYY') as month_name,
        monthly_revenue,
        LAG(monthly_revenue) OVER (ORDER BY month) as previous_month_revenue,
        ROUND(
          ((monthly_revenue - LAG(monthly_revenue) OVER (ORDER BY month)) / 
          LAG(monthly_revenue) OVER (ORDER BY month)) * 100, 2
        ) as growth_percentage
      FROM monthly_revenue
      ORDER BY month DESC
      LIMIT 6
    `);
    
    return {
      ...financialReport,
      growth_analysis: growthResult.rows.map(row => ({
        month: row.month_name,
        revenue: parseFloat(row.monthly_revenue || 0),
        previous_month_revenue: parseFloat(row.previous_month_revenue || 0),
        growth_percentage: parseFloat(row.growth_percentage || 0)
      }))
    };
  }
  
  /**
   * Generate services report
   */
  static async generateServicesReport(dateRange) {
    const { start_date, end_date } = dateRange;
    
    // Most popular services
    const popularServicesResult = await db.query(`
      SELECT 
        s.service_name,
        s.service_code,
        s.category,
        s.price,
        COUNT(bi.id) as usage_count,
        SUM(bi.subtotal) as total_revenue
      FROM services s
      JOIN bill_items bi ON s.id = bi.service_id
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.payment_status = 'paid'
      AND DATE(b.created_at) BETWEEN $1 AND $2
      GROUP BY s.id, s.service_name, s.service_code, s.category, s.price
      ORDER BY usage_count DESC
      LIMIT 20
    `, [start_date, end_date]);
    
    // Service utilization by category
    const categoryUtilizationResult = await db.query(`
      SELECT 
        s.category,
        COUNT(DISTINCT s.id) as service_count,
        COUNT(bi.id) as total_usage,
        SUM(bi.subtotal) as category_revenue,
        ROUND(AVG(s.price), 2) as average_price
      FROM services s
      LEFT JOIN bill_items bi ON s.id = bi.service_id
      LEFT JOIN bills b ON bi.bill_id = b.id AND b.payment_status = 'paid'
      AND DATE(b.created_at) BETWEEN $1 AND $2
      WHERE s.category IS NOT NULL
      GROUP BY s.category
      ORDER BY category_revenue DESC
    `, [start_date, end_date]);
    
    // Service growth trends
    const growthResult = await db.query(`
      WITH monthly_usage AS (
        SELECT 
          s.service_code,
          DATE_TRUNC('month', b.created_at) as month,
          COUNT(bi.id) as monthly_usage,
          SUM(bi.subtotal) as monthly_revenue
        FROM services s
        JOIN bill_items bi ON s.id = bi.service_id
        JOIN bills b ON bi.bill_id = b.id
        WHERE b.payment_status = 'paid'
        AND b.created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY s.service_code, DATE_TRUNC('month', b.created_at)
      )
      SELECT 
        service_code,
        ARRAY_AGG(TO_CHAR(month, 'Mon')) as months,
        ARRAY_AGG(monthly_usage) as usage_trend,
        ARRAY_AGG(monthly_revenue) as revenue_trend
      FROM monthly_usage
      GROUP BY service_code
      ORDER BY SUM(monthly_revenue) DESC
      LIMIT 10
    `);
    
    return {
      report_type: "services",
      most_popular_services: popularServicesResult.rows.map(row => ({
        service_name: row.service_name,
        service_code: row.service_code,
        category: row.category,
        price: parseFloat(row.price),
        usage_count: parseInt(row.usage_count),
        total_revenue: parseFloat(row.total_revenue || 0)
      })),
      category_utilization: categoryUtilizationResult.rows.map(row => ({
        category: row.category,
        service_count: parseInt(row.service_count),
        total_usage: parseInt(row.total_usage),
        category_revenue: parseFloat(row.category_revenue || 0),
        average_price: parseFloat(row.average_price || 0)
      })),
      growth_trends: growthResult.rows.map(row => ({
        service_code: row.service_code,
        months: row.months,
        usage_trend: row.usage_trend.map(val => parseInt(val)),
        revenue_trend: row.revenue_trend.map(val => parseFloat(val || 0))
      }))
    };
  }
  
  /**
   * Get real-time statistics
   * GET /api/dashboard/realtime
   */
  static async getRealtimeStats(req, res) {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      
      // Get today's appointments in progress
      const inProgressResult = await db.query(`
        SELECT COUNT(*) as in_progress_count
        FROM appointments 
        WHERE DATE(appointment_date) = $1
        AND status = 'in-progress'
      `, [today]);
      
      // Get patients waiting
      const waitingResult = await db.query(`
        SELECT COUNT(*) as waiting_count
        FROM appointments 
        WHERE DATE(appointment_date) = $1
        AND status = 'checked-in'
      `, [today]);
      
      // Get today's revenue so far
      const todayRevenueResult = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as today_revenue
        FROM bills 
        WHERE DATE(created_at) = $1
        AND payment_status = 'paid'
      `, [today]);
      
      // Get next appointments
      const nextAppointmentsResult = await db.query(`
        SELECT 
          a.id,
          a.appointment_date,
          p.full_name as patient_name,
          u.name as doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.doctor_id = u.id
        WHERE DATE(a.appointment_date) = $1
        AND a.status = 'scheduled'
        AND a.appointment_date > $2
        ORDER BY a.appointment_date ASC
        LIMIT 5
      `, [today, now.toISOString()]);
      
      // Get recent payments
      const recentPaymentsResult = await db.query(`
        SELECT 
          b.bill_number,
          p.full_name as patient_name,
          b.total_amount,
          b.payment_method,
          b.created_at
        FROM bills b
        JOIN patients p ON b.patient_id = p.id
        WHERE b.payment_status = 'paid'
        ORDER BY b.created_at DESC
        LIMIT 5
      `, [today]);
      
      const realtimeStats = {
        timestamp: now.toISOString(),
        in_progress_appointments: parseInt(inProgressResult.rows[0].in_progress_count),
        waiting_patients: parseInt(waitingResult.rows[0].waiting_count),
        today_revenue: parseFloat(todayRevenueResult.rows[0].today_revenue),
        next_appointments: nextAppointmentsResult.rows.map(row => ({
          id: row.id,
          appointment_time: new Date(row.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          patient_name: row.patient_name,
          doctor_name: row.doctor_name
        })),
        recent_payments: recentPaymentsResult.rows.map(row => ({
          bill_number: row.bill_number,
          patient_name: row.patient_name,
          amount: parseFloat(row.total_amount),
          payment_method: row.payment_method,
          time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
      };
      
      return res.json({
        success: true,
        data: realtimeStats
      });
      
    } catch (error) {
      console.error('Get Realtime Stats Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch real-time statistics. Please try again later."
      });
    }
  }
}

module.exports = DashboardController;