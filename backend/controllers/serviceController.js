const Service = require('../models/Service');

class ServiceController {
  
  /**
   * Create a new medical service
   * POST /api/services
   */
  static async createService(req, res) {
    try {
      const serviceData = req.body;
      
      // Validate required fields
      if (!serviceData.service_code || !serviceData.service_name || !serviceData.price) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Service code, service name, and price are required."
        });
      }
      
      // Create service
      const service = await Service.create(serviceData);
      
      return res.status(201).json({
        success: true,
        message: "Service created successfully",
        data: service
      });
      
    } catch (error) {
      console.error('Create Service Error:', error);
      
      if (error.message === 'Service code already exists') {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: "A service with this code already exists."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create service. Please try again later."
      });
    }
  }
  
  /**
   * Get all services with filters
   * GET /api/services
   */
  static async getAllServices(req, res) {
    try {
      const { 
        category, 
        search, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      const filters = {};
      if (category) filters.category = category;
      if (search) filters.search = search;
      
      const result = await Service.findAll(filters, page, limit);
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Get All Services Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch services. Please try again later."
      });
    }
  }
  
  /**
   * Get service by ID
   * GET /api/services/:id
   */
  static async getServiceById(req, res) {
    try {
      const { id } = req.params;
      
      const service = await Service.findById(id);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Service with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        data: service
      });
      
    } catch (error) {
      console.error('Get Service Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch service. Please try again later."
      });
    }
  }
  
  /**
   * Get service by code
   * GET /api/services/code/:code
   */
  static async getServiceByCode(req, res) {
    try {
      const { code } = req.params;
      
      const service = await Service.findByCode(code);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Service with code '${code}' not found.`
        });
      }
      
      return res.json({
        success: true,
        data: service
      });
      
    } catch (error) {
      console.error('Get Service By Code Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch service. Please try again later."
      });
    }
  }
  
  /**
   * Update service
   * PUT /api/services/:id
   */
  static async updateService(req, res) {
    try {
      const { id } = req.params;
      
      // Don't allow service code updates (should be immutable)
      if (req.body.service_code) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Service code cannot be changed."
        });
      }
      
      const updatedService = await Service.update(id, req.body);
      
      if (!updatedService) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Service with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Service updated successfully",
        data: updatedService
      });
      
    } catch (error) {
      console.error('Update Service Error:', error);
      
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "No valid fields to update."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update service. Please try again later."
      });
    }
  }
  
  /**
   * Delete service (soft delete)
   * DELETE /api/services/:id
   */
  static async deleteService(req, res) {
    try {
      const { id } = req.params;
      
      // Check if service exists and is active
      const service = await Service.findById(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Service with ID '${id}' not found.`
        });
      }
      
      // Check if service is used in any bills
      const db = require('../config/database');
      const usageCheck = await db.query(
        `SELECT COUNT(*) FROM bill_items WHERE service_id = $1`,
        [id]
      );
      
      const usageCount = parseInt(usageCheck.rows[0].count);
      if (usageCount > 0) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: `Cannot delete service. It is used in ${usageCount} bill(s). Consider deactivating instead.`
        });
      }
      
      // Soft delete service
      const deletedService = await Service.delete(id);
      
      return res.json({
        success: true,
        message: "Service deleted successfully"
      });
      
    } catch (error) {
      console.error('Delete Service Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to delete service. Please try again later."
      });
    }
  }
  
  /**
   * Deactivate service (instead of delete)
   * PUT /api/services/:id/deactivate
   */
  static async deactivateService(req, res) {
    try {
      const { id } = req.params;
      
      const deactivatedService = await Service.update(id, { is_active: false });
      
      if (!deactivatedService) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Service with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Service deactivated successfully",
        data: deactivatedService
      });
      
    } catch (error) {
      console.error('Deactivate Service Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to deactivate service. Please try again later."
      });
    }
  }
  
  /**
   * Activate service
   * PUT /api/services/:id/activate
   */
  static async activateService(req, res) {
    try {
      const { id } = req.params;
      
      const activatedService = await Service.update(id, { is_active: true });
      
      if (!activatedService) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Service with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Service activated successfully",
        data: activatedService
      });
      
    } catch (error) {
      console.error('Activate Service Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to activate service. Please try again later."
      });
    }
  }
  
  /**
   * Get services by category
   * GET /api/services/category/:category
   */
  static async getServicesByCategory(req, res) {
    try {
      const { category } = req.params;
      
      const services = await Service.getByCategory(category);
      
      return res.json({
        success: true,
        data: services
      });
      
    } catch (error) {
      console.error('Get Services By Category Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch services by category. Please try again later."
      });
    }
  }
  
  /**
   * Get service categories
   * GET /api/services/categories
   */
  static async getServiceCategories(req, res) {
    try {
      const db = require('../config/database');
      
      const result = await db.query(
        `SELECT DISTINCT category 
         FROM services 
         WHERE category IS NOT NULL 
         AND is_active = TRUE
         ORDER BY category`
      );
      
      const categories = result.rows.map(row => row.category);
      
      return res.json({
        success: true,
        data: categories
      });
      
    } catch (error) {
      console.error('Get Service Categories Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch service categories. Please try again later."
      });
    }
  }
  
  /**
   * Search services by name or description
   * GET /api/services/search?q=query
   */
  static async searchServices(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Search query must be at least 2 characters long."
        });
      }
      
      const result = await Service.findAll({ search: q }, 1, 20);
      
      return res.json({
        success: true,
        data: result.data
      });
      
    } catch (error) {
      console.error('Search Services Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to search services. Please try again later."
      });
    }
  }
  
  /**
   * Import multiple services (for initial setup)
   * POST /api/services/import
   */
  static async importServices(req, res) {
    try {
      const { services } = req.body;
      
      if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Services array is required and must not be empty."
        });
      }
      
      // Limit import size
      if (services.length > 100) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Cannot import more than 100 services at once."
        });
      }
      
      const results = {
        success: [],
        failed: []
      };
      
      // Process each service
      for (const serviceData of services) {
        try {
          const service = await Service.create(serviceData);
          results.success.push({
            service_code: service.service_code,
            id: service.id
          });
        } catch (error) {
          results.failed.push({
            service_code: serviceData.service_code,
            error: error.message
          });
        }
      }
      
      return res.json({
        success: true,
        message: `Services import completed. Success: ${results.success.length}, Failed: ${results.failed.length}`,
        data: results
      });
      
    } catch (error) {
      console.error('Import Services Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to import services. Please try again later."
      });
    }
  }
  
  /**
   * Get service statistics
   * GET /api/services/statistics
   */
  static async getServiceStatistics(req, res) {
    try {
      const db = require('../config/database');
      
      // Get service count by category
      const categoryStats = await db.query(
        `SELECT 
          category,
          COUNT(*) as service_count,
          AVG(price) as average_price,
          MIN(price) as min_price,
          MAX(price) as max_price
         FROM services 
         WHERE is_active = TRUE
         AND category IS NOT NULL
         GROUP BY category
         ORDER BY category`
      );
      
      // Get overall statistics
      const overallStats = await db.query(
        `SELECT 
          COUNT(*) as total_services,
          COUNT(DISTINCT category) as category_count,
          AVG(price) as overall_average_price,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_services,
          SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_services
         FROM services`
      );
      
      // Get most expensive services
      const expensiveServices = await db.query(
        `SELECT service_code, service_name, price, category
         FROM services 
         WHERE is_active = TRUE
         ORDER BY price DESC
         LIMIT 10`
      );
      
      return res.json({
        success: true,
        data: {
          overall: overallStats.rows[0],
          by_category: categoryStats.rows,
          top_expensive: expensiveServices.rows
        }
      });
      
    } catch (error) {
      console.error('Get Service Statistics Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch service statistics. Please try again later."
      });
    }
  }
}

module.exports = ServiceController;