const db = require('../config/database');

class Service {
  /**
   * Create a new service
   */
  static async create(serviceData) {
    const {
      service_code, service_name, description = null,
      price, category = null, duration_minutes = 30
    } = serviceData;
    
    try {
      const result = await db.query(
        `INSERT INTO services (
          service_code, service_name, description,
          price, category, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [service_code, service_name, description, price, category, duration_minutes]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Service code already exists');
      }
      throw error;
    }
  }
  
  /**
   * Find service by ID
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT * FROM services WHERE id = $1 AND is_active = TRUE`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Find service by code
   */
  static async findByCode(code) {
    try {
      const result = await db.query(
        `SELECT * FROM services WHERE service_code = $1 AND is_active = TRUE`,
        [code]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all services with filters
   */
  static async findAll(filters = {}, page = 1, limit = 20) {
    const { category, search } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE is_active = TRUE';
    const params = [];
    let paramCount = 1;
    
    if (category) {
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (search) {
      whereClause += ` AND (
        service_name ILIKE $${paramCount} OR 
        service_code ILIKE $${paramCount} OR
        description ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    try {
      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) FROM services ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      const queryParams = [...params, limit, offset];
      const result = await db.query(
        `SELECT * FROM services 
         ${whereClause}
         ORDER BY service_name ASC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        queryParams
      );
      
      return {
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update service
   */
  static async update(id, updateData) {
    const allowedFields = [
      'service_name', 'description', 'price',
      'category', 'duration_minutes', 'is_active'
    ];
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    try {
      const result = await db.query(
        `UPDATE services 
         SET ${fields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Soft delete service
   */
  static async delete(id) {
    try {
      const result = await db.query(
        `UPDATE services 
         SET is_active = FALSE
         WHERE id = $1
         RETURNING id`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get services by category
   */
  static async getByCategory(category) {
    try {
      const result = await db.query(
        `SELECT * FROM services 
         WHERE category = $1 AND is_active = TRUE
         ORDER BY service_name`,
        [category]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Service;