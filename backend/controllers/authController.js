const jwt = require('jsonwebtoken');
const User = require('../models/User');
const jwtConfig = require('../config/jwt');

class AuthController {
  
  /**
   * User login
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate input (basic check - detailed validation in middleware)
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Email and password are required."
        });
      }
      
      // 1. Find user by email
      const user = await User.findByEmail(email);
      
      // 2. Check if user exists
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
          message: "Invalid email or password."
        });
      }
      
      // 3. Verify password
      const isPasswordValid = await User.comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
          message: "Invalid email or password."
        });
      }
      
      // 4. Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: "Account disabled",
          message: "Your account has been deactivated. Please contact administrator."
        });
      }
      
      // 5. Create JWT payload (data to be stored in token)
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        specialization: user.specialization
      };
      
      // 6. Generate JWT token
      const token = jwt.sign(payload, jwtConfig.secret, jwtConfig.options);
      
      // 7. Prepare user data for response (exclude password)
      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        phone: user.phone,
        department: user.department,
        is_active: user.is_active,
        created_at: user.created_at
      };
      
      // 8. Send success response
      return res.json({
        success: true,
        message: "Login successful",
        token: token,
        user: userResponse
      });
      
    } catch (error) {
      console.error('Login Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Login failed. Please try again later."
      });
    }
  }
  
  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  static async getProfile(req, res) {
    try {
      // req.user is set by authenticateToken middleware
      const userId = req.user.id;
      
      // Get user from database
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: "User not found."
        });
      }
      
      // Send response
      return res.json({
        success: true,
        data: user
      });
      
    } catch (error) {
      console.error('Get Profile Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch profile. Please try again later."
      });
    }
  }
  
  /**
   * Refresh token (optional - for implementing token refresh)
   * POST /api/auth/refresh
   */
  static async refreshToken(req, res) {
    try {
      // Note: This is a basic implementation
      // In production, you might want to use refresh tokens stored in database
      
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Token is required."
        });
      }
      
      // Verify the old token (with ignoreExpiration to allow expired tokens)
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        ignoreExpiration: true // Allow expired tokens for refresh
      });
      
      // Get fresh user data from database
      const user = await User.findById(decoded.id);
      
      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
          message: "User not found or inactive."
        });
      }
      
      // Create new payload
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        specialization: user.specialization
      };
      
      // Generate new token
      const newToken = jwt.sign(payload, jwtConfig.secret, jwtConfig.options);
      
      // Send response
      return res.json({
        success: true,
        message: "Token refreshed successfully",
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Refresh Token Error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          error: "Invalid token",
          message: "Invalid refresh token."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to refresh token. Please login again."
      });
    }
  }
}

module.exports = AuthController;