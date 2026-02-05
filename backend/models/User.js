const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  
  // Create a new user (modified for your schema)
  static async create(userData) {
    const { 
      name, email, password, role, 
      specialization = null, phone = null, department = null 
    } = userData;
    
    // Hash password using bcrypt (as per your schema requirement)
    // Note: Your schema uses 'password' column, not 'password_hash'
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      // Using your existing database connection
      const result = await db.query(
        `INSERT INTO users (
          name, email, password, role, 
          specialization, phone, department
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id, name, email, role, specialization, 
          phone, department, is_active, created_at`,
        [name, email, hashedPassword, role, specialization, phone, department]
      );
      
      return result.rows[0];
    } catch (error) {
      // Handle PostgreSQL specific errors
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }
  
  // Find user by email (for login)
  static async findByEmail(email) {
    try {
      const result = await db.query(
        `SELECT * FROM users 
         WHERE email = $1 AND is_active = TRUE`,
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Find user by ID (excluding password)
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT 
          id, name, email, role, specialization, 
          phone, department, is_active, 
          created_at, updated_at
         FROM users 
         WHERE id = $1 AND is_active = TRUE`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get all users with pagination and filtering
  static async findAll(filters = {}, page = 1, limit = 20) {
    const { role, department } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE is_active = TRUE';
    const params = [];
    let paramCount = 1;
    
    // Build WHERE clause dynamically
    if (role) {
      whereClause += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }
    
    if (department) {
      whereClause += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }
    
    try {
      // Count total records first
      const countResult = await db.query(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      params.push(limit, offset);
      const result = await db.query(
        `SELECT 
          id, name, email, role, specialization, 
          phone, department, is_active, 
          created_at, updated_at
         FROM users 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params
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
  
  // Update user information
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    // Dynamically build SET clause based on provided fields
    Object.keys(updateData).forEach(key => {
      // Skip password updates here (should be separate method)
      if (key !== 'password' && updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Add ID as last parameter
    values.push(id);
    
    try {
      const result = await db.query(
        `UPDATE users 
         SET ${fields.join(', ')}
         WHERE id = $${paramCount} AND is_active = TRUE
         RETURNING 
           id, name, email, role, specialization, 
           phone, department, is_active, 
           created_at, updated_at`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }
  
  // Update password
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    try {
      const result = await db.query(
        `UPDATE users 
         SET password = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id`,
        [hashedPassword, id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete user (soft delete)
  static async delete(id) {
    try {
      const result = await db.query(
        `UPDATE users 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Compare password for login
  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
}

module.exports = User;