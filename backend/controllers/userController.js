const User = require('../models/User');

class UserController {
  
  /**
   * Create a new user (Admin only)
   * POST /api/users
   */
  static async createUser(req, res) {
    try {
      // Create user in database
      const newUser = await User.create(req.body);
      
      // Send success response
      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser
      });
      
    } catch (error) {
      console.error('Create User Error:', error);
      
      // Handle specific errors
      if (error.message === 'Email already exists') {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: "A user with this email already exists."
        });
      }
      
      // Handle validation errors
      if (error.code === '23514') { // Check constraint violation
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Invalid role or data format."
        });
      }
      
      // Generic server error
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create user. Please try again later."
      });
    }
  }
  
  /**
   * Get all users with pagination (Admin only)
   * GET /api/users
   */
  static async getAllUsers(req, res) {
    try {
      // Extract query parameters
      const { 
        role, 
        department, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      // Build filters object
      const filters = {};
      if (role) filters.role = role;
      if (department) filters.department = department;
      
      // Get users from database
      const result = await User.findAll(filters, page, limit);
      
      // Send response
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Get All Users Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch users. Please try again later."
      });
    }
  }
  
  /**
   * Get specific user by ID
   * GET /api/users/:id
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      // Get user from database
      const user = await User.findById(id);
      
      // Check if user exists
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `User with ID '${id}' not found.`
        });
      }
      
      // Send response
      return res.json({
        success: true,
        data: user
      });
      
    } catch (error) {
      console.error('Get User Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch user. Please try again later."
      });
    }
  }
  
  /**
   * Update user information
   * PUT /api/users/:id
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      
      // Don't allow password updates via this endpoint
      if (req.body.password) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Use /api/users/:id/password to update password."
        });
      }
      
      // Update user in database
      const updatedUser = await User.update(id, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `User with ID '${id}' not found.`
        });
      }
      
      // Send response
      return res.json({
        success: true,
        message: "User updated successfully",
        data: updatedUser
      });
      
    } catch (error) {
      console.error('Update User Error:', error);
      
      if (error.message === 'Email already exists') {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: "Email already exists."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update user. Please try again later."
      });
    }
  }
  
  /**
   * Delete user (soft delete - Admin only)
   * DELETE /api/users/:id
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent users from deleting themselves
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "You cannot delete your own account."
        });
      }
      
      // Soft delete user (set is_active = false)
      const deletedUser = await User.delete(id);
      
      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `User with ID '${id}' not found.`
        });
      }
      
      // Send response
      return res.json({
        success: true,
        message: "User deleted successfully"
      });
      
    } catch (error) {
      console.error('Delete User Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to delete user. Please try again later."
      });
    }
  }
  
  /**
   * Update user password
   * PUT /api/users/:id/password
   */
  static async updatePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Current password and new password are required."
        });
      }
      
      // Only allow users to update their own password
      // Or admins to update any password (without knowing current password)
      if (req.user.id === id) {
        // User updating their own password - verify current password
        const user = await User.findByEmail(req.user.email);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: "Not found",
            message: "User not found."
          });
        }
        
        const isValidPassword = await User.comparePassword(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Current password is incorrect."
          });
        }
      } else if (req.user.role !== 'admin') {
        // Non-admin trying to update someone else's password
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You can only update your own password."
        });
      }
      
      // Update password
      await User.updatePassword(id, newPassword);
      
      return res.json({
        success: true,
        message: "Password updated successfully"
      });
      
    } catch (error) {
      console.error('Update Password Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update password. Please try again later."
      });
    }
  }
}

module.exports = UserController;