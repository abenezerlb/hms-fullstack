import express from "express";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import { queryDatabase } from "./lib.js";
import { generateSessionId } from "./lib.js";

const app = express();
const port = process.env.PORT || 3000;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// CORS Configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5500",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(cookieParser());

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * POST /api/auth/login
 * Supports both session-based (cookie) and JWT token authentication
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, authType = 'session' } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Email and password are required"
      });
    }
    
    // 1. Find user by email (using your existing users table structure)
    const rows = await queryDatabase(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Invalid email or password"
      });
    }
    
    const user = rows[0];
    
    // 2. Verify password
    if (!user.password_hash) {
      return res.status(500).json({
        success: false,
        error: "Database error",
        message: "Password hash not found"
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Invalid email or password"
      });
    }
    
    // 3. Check auth type and respond accordingly
    if (authType === 'token') {
      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };
      
      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'hms-api',
        audience: 'hms-users'
      });
      
      // Return JWT token in response
      return res.json({
        success: true,
        message: "Login successful (JWT)",
        token: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          specialization: user.specialization
        }
      });
      
    } else {
      // Session-based authentication (your friend's method)
      const sessionId = generateSessionId();
      
      await queryDatabase(
        "INSERT INTO sessions(id, user_id, expires_at) VALUES(?, ?, ?)",
        [sessionId, user.id, Date.now() + 24 * 60 * 60 * 1000]
      );
      
      // Set session cookie
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production'
      });
      
      // Return success response
      return res.json({
        success: true,
        message: "Login successful (Session)",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          specialization: user.specialization
        }
      });
    }
    
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Login failed. Please try again."
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout - clears session or invalidates token
 */
app.post("/api/auth/logout", async (req, res) => {
  try {
    // Check for session cookie
    const sessionId = req.cookies?.session_id;
    
    if (sessionId) {
      // Delete session from database
      await queryDatabase("DELETE FROM sessions WHERE id = ?", [sessionId]);
      
      // Clear session cookie
      res.clearCookie("session_id", {
        httpOnly: true,
        sameSite: "Strict",
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    // For JWT tokens, client should discard the token
    
    return res.json({
      success: true,
      message: "Logout successful"
    });
    
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Logout failed"
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile - works with both session and JWT
 */
app.get("/api/auth/profile", async (req, res) => {
  try {
    // The authentication will be handled by middleware
    // req.user is set by the middleware
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "Please login first"
      });
    }
    
    // Fetch fresh user data from database
    const userRows = await queryDatabase(
      `SELECT id, name, email, role, specialization, 
              phone, department, is_active, created_at
       FROM users 
       WHERE id = ? AND is_active = TRUE`,
      [req.user.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User account no longer exists"
      });
    }
    
    return res.json({
      success: true,
      data: userRows[0]
    });
    
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch profile"
    });
  }
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * Dual authentication middleware
 * Supports both:
 * 1. Session-based (cookie) authentication (your friend's method)
 * 2. JWT token-based authentication (my method)
 */
async function authMiddleware(req, res, next) {
  try {
    let user = null;
    
    // 1. First check for JWT token in Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET, {
          issuer: 'hms-api',
          audience: 'hms-users'
        });
        
        // Verify user still exists and is active
        const userRows = await queryDatabase(
          "SELECT id, email, role, name, is_active FROM users WHERE id = ? AND is_active = TRUE",
          [decoded.id]
        );
        
        if (userRows.length > 0) {
          user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
            authMethod: 'jwt'
          };
        }
      } catch (jwtError) {
        // JWT verification failed, try session auth
        console.log("JWT verification failed:", jwtError.message);
      }
    }
    
    // 2. If no JWT user found, try session-based authentication
    if (!user) {
      const sessionId = req.cookies?.session_id;
      
      if (sessionId) {
        const sessionRows = await queryDatabase(
          `SELECT s.id AS session_id, s.expires_at, s.user_id,
                  u.id AS id, u.email, u.role, u.name, u.is_active
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.id = ? AND s.expires_at > ? AND u.is_active = TRUE`,
          [sessionId, Date.now()]
        );
        
        if (sessionRows.length > 0) {
          const sessionData = sessionRows[0];
          user = {
            id: sessionData.id,
            email: sessionData.email,
            role: sessionData.role,
            name: sessionData.name,
            authMethod: 'session',
            sessionId: sessionData.session_id
          };
        }
      }
    }
    
    // 3. If no authentication method worked
    if (!user) {
      // Check if route requires authentication
      const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/health',
        '/api/test-db'
      ];
      
      // Allow access to public routes
      if (publicRoutes.includes(req.path)) {
        return next();
      }
      
      // For API routes, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "Please login or provide a valid token"
        });
      }
      
      // For other routes, maintain your friend's error format
      return res.status(401).send({ error: "Authentication required" });
    }
    
    // 4. Attach user to request object
    req.user = user;
    next();
    
  } catch (err) {
    console.error("Auth middleware error:", err);
    
    // Return appropriate error response
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        error: "Authentication error",
        message: "Failed to authenticate user"
      });
    }
    
    next(err);
  }
}

// Apply authentication middleware to all routes
app.use(authMiddleware);

// ==================== USER MANAGEMENT ENDPOINTS ====================

/**
 * GET /api/users
 * Get all users (Admin only)
 */
app.get("/api/users", async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "Admin access required"
      });
    }
    
    // Parse query parameters
    const { 
      role, 
      department, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;
    
    // Build query
    let query = `
      SELECT id, name, email, role, specialization, 
             phone, department, is_active, created_at
      FROM users 
      WHERE is_active = TRUE
    `;
    const params = [];
    
    // Add filters
    if (role) {
      query += " AND role = ?";
      params.push(role);
    }
    
    if (department) {
      query += " AND department = ?";
      params.push(department);
    }
    
    if (search) {
      query += " AND (name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);
    
    // Execute query
    const users = await queryDatabase(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      WHERE is_active = TRUE
      ${role ? " AND role = ?" : ""}
      ${department ? " AND department = ?" : ""}
    `;
    const countParams = [];
    if (role) countParams.push(role);
    if (department) countParams.push(department);
    
    const countResult = await queryDatabase(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    return res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch users"
    });
  }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
app.post("/api/users", async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "Admin access required"
      });
    }
    
    const { 
      name, email, password, role, 
      specialization, phone, department 
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Name, email, password, and role are required"
      });
    }
    
    // Check if email already exists
    const existingUser = await queryDatabase(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Conflict",
        message: "User with this email already exists"
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const result = await queryDatabase(
      `INSERT INTO users (
        name, email, password_hash, role, 
        specialization, phone, department
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, name, email, role, specialization, 
                phone, department, is_active, created_at`,
      [name, email, hashedPassword, role, 
       specialization || null, phone || null, department || null]
    );
    
    const newUser = result[0];
    
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser
    });
    
  } catch (error) {
    console.error("Create user error:", error);
    
    // Handle database errors
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        error: "Conflict",
        message: "User with this email already exists"
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to create user"
    });
  }
});

/**
 * GET /api/users/:id
 * Get specific user
 */
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Allow users to view their own profile or admin to view any profile
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You can only view your own profile"
      });
    }
    
    const userRows = await queryDatabase(
      `SELECT id, name, email, role, specialization, 
              phone, department, is_active, created_at
       FROM users 
       WHERE id = ? AND is_active = TRUE`,
      [id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Not found",
        message: `User with ID '${id}' not found`
      });
    }
    
    return res.json({
      success: true,
      data: userRows[0]
    });
    
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch user"
    });
  }
});

// ==================== HEALTH & UTILITY ENDPOINTS ====================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Healthcare Management System API",
    version: "1.0.0",
    authentication: {
      supported: ["session", "jwt"],
      current: req.user?.authMethod || "none"
    }
  });
});

/**
 * GET /api/test-db
 * Test database connection
 */
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await queryDatabase("SELECT NOW() as time, version() as version");
    
    return res.json({
      success: true,
      message: "Database connected successfully",
      data: result[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database test error:", error);
    return res.status(500).json({
      success: false,
      error: "Database connection failed",
      message: error.message
    });
  }
});

/**
 * GET /me (Your friend's endpoint - kept for compatibility)
 */
app.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Authentication required" });
  }
  
  res.send({ 
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: "Not found",
      message: `Route ${req.method} ${req.path} not found`
    });
  }
  
  // For non-API routes, send plain text
  res.status(404).send("404 - Not Found");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Something went wrong on our end",
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  // For non-API routes
  res.status(500).send("500 - Internal Server Error");
});

// ==================== START SERVER ====================

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📚 API Base URL: http://localhost:${port}/api`);
  console.log(`🔐 Authentication: Session + JWT supported`);
});