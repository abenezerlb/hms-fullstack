import express from "express";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import { queryDatabase } from "./lib.js";
import { generateSessionId } from "./lib.js";

const app = express();

// Load environment variables
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';
const JWT_EXPIRES_IN = '24h';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS Configuration
const corsOptions = {
  origin: NODE_ENV === 'development' 
    ? "http://localhost:5500" 
    : process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
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
    
    // 1. Find user by email
    const rows = await queryDatabase(
      "SELECT * FROM users WHERE email = $1 AND is_active = TRUE",
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
        name: user.name,
        department: user.department,
        specialization: user.specialization
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
          specialization: user.specialization,
          phone: user.phone
        }
      });
      
    } else {
      // Session-based authentication
      const sessionId = generateSessionId();
      
      await queryDatabase(
        "INSERT INTO sessions(id, user_id, expires_at) VALUES($1, $2, $3)",
        [sessionId, user.id, Date.now() + 24 * 60 * 60 * 1000]
      );
      
      // Set session cookie
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        sameSite: NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
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
          specialization: user.specialization,
          phone: user.phone
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
 * POST /api/auth/register (Optional - for user registration)
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { 
      name, email, password, role = 'patient',
      phone, date_of_birth, gender, address 
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Name, email, and password are required"
      });
    }
    
    // Check if email already exists
    const existingUser = await queryDatabase(
      "SELECT id FROM users WHERE email = $1",
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
    
    // Start transaction for user and patient creation
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert user
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, email, role, created_at`,
        [name, email, hashedPassword, role]
      );
      
      const newUser = userResult.rows[0];
      
      // If role is patient, also create patient record
      if (role === 'patient') {
        await client.query(
          `INSERT INTO patients (
            full_name, email, phone, date_of_birth, gender, address
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [name, email, phone || null, date_of_birth || null, 
           gender || null, address || null]
        );
      }
      
      await client.query('COMMIT');
      
      // Generate JWT token for immediate login
      const tokenPayload = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name
      };
      
      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'hms-api',
        audience: 'hms-users'
      });
      
      return res.status(201).json({
        success: true,
        message: "Registration successful",
        token: token,
        user: newUser
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Registration failed. Please try again."
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
      await queryDatabase("DELETE FROM sessions WHERE id = $1", [sessionId]);
      
      // Clear session cookie
      res.clearCookie("session_id", {
        httpOnly: true,
        sameSite: NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: NODE_ENV === 'production',
        path: '/'
      });
    }
    
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
 * Get current user profile
 */
app.get("/api/auth/profile", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "Please login first"
      });
    }
    
    // Fetch fresh user data
    const userRows = await queryDatabase(
      `SELECT id, name, email, role, specialization, 
              phone, department, is_active, created_at
       FROM users 
       WHERE id = $1 AND is_active = TRUE`,
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
 */
async function authMiddleware(req, res, next) {
  try {
    let user = null;
    
    // 1. First check for JWT token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET, {
          issuer: 'hms-api',
          audience: 'hms-users'
        });
        
        // Verify user exists and is active
        const userRows = await queryDatabase(
          `SELECT id, email, role, name, department, 
                  specialization, is_active 
           FROM users 
           WHERE id = $1 AND is_active = TRUE`,
          [decoded.id]
        );
        
        if (userRows.length > 0) {
          user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
            department: decoded.department,
            specialization: decoded.specialization,
            authMethod: 'jwt'
          };
        }
      } catch (jwtError) {
        console.log("JWT verification failed:", jwtError.message);
      }
    }
    
    // 2. Try session-based authentication
    if (!user) {
      const sessionId = req.cookies?.session_id;
      
      if (sessionId) {
        const sessionRows = await queryDatabase(
          `SELECT s.id AS session_id, s.expires_at, s.user_id,
                  u.id AS id, u.email, u.role, u.name, 
                  u.department, u.specialization, u.is_active
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.id = $1 AND s.expires_at > $2 AND u.is_active = TRUE`,
          [sessionId, Date.now()]
        );
        
        if (sessionRows.length > 0) {
          const sessionData = sessionRows[0];
          user = {
            id: sessionData.id,
            email: sessionData.email,
            role: sessionData.role,
            name: sessionData.name,
            department: sessionData.department,
            specialization: sessionData.specialization,
            authMethod: 'session',
            sessionId: sessionData.session_id
          };
        }
      }
    }
    
    // 3. If no authentication found
    if (!user) {
      const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/health',
        '/api/test-db'
      ];
      
      if (publicRoutes.includes(req.path)) {
        return next();
      }
      
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "Please login or provide a valid token"
        });
      }
      
      return res.status(401).send({ error: "Authentication required" });
    }
    
    // 4. Attach user to request
    req.user = user;
    next();
    
  } catch (err) {
    console.error("Auth middleware error:", err);
    
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

// Apply authentication middleware
app.use(authMiddleware);

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/users
 * Get all users (Admin only)
 */
app.get("/api/users", async (req, res) => {
  try {
    // Admin check
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
    
    // Build query with PostgreSQL syntax
    let query = `
      SELECT id, name, email, role, specialization, 
             phone, department, is_active, created_at
      FROM users 
      WHERE is_active = TRUE
    `;
    const params = [];
    let paramCount = 1;
    
    // Add filters
    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }
    
    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount + 1} OR phone ILIKE $${paramCount + 2})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramCount += 3;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);
    
    // Execute query
    const result = await queryDatabase(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE is_active = TRUE`;
    const countParams = [];
    paramCount = 1;
    
    if (role) {
      countQuery += ` AND role = $${paramCount}`;
      countParams.push(role);
      paramCount++;
    }
    
    if (department) {
      countQuery += ` AND department = $${paramCount}`;
      countParams.push(department);
    }
    
    const countResult = await queryDatabase(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    return res.json({
      success: true,
      data: result,
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
    // Admin check
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
    
    // Check if email exists
    const existingUser = await queryDatabase(
      "SELECT id FROM users WHERE email = $1",
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
    
    // Insert user
    const result = await queryDatabase(
      `INSERT INTO users (
        name, email, password_hash, role, 
        specialization, phone, department
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
    
    if (error.code === '23505') {
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
    
    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You can only view your own profile"
      });
    }
    
    const userRows = await queryDatabase(
      `SELECT id, name, email, role, specialization, 
              phone, department, is_active, created_at, updated_at
       FROM users 
       WHERE id = $1 AND is_active = TRUE`,
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

/**
 * PUT /api/users/:id
 * Update user
 */
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Authorization check
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You can only update your own profile"
      });
    }
    
    const updates = req.body;
    
    // Don't allow password updates here
    if (updates.password) {
      return res.status(400).json({
        success: false,
        error: "Bad request",
        message: "Use /api/users/:id/password to update password"
      });
    }
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (key !== 'password' && updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Bad request",
        message: "No fields to update"
      });
    }
    
    values.push(id);
    
    const result = await queryDatabase(
      `UPDATE users 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND is_active = TRUE
       RETURNING id, name, email, role, specialization, 
                 phone, department, is_active, created_at, updated_at`,
      values
    );
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Not found",
        message: `User with ID '${id}' not found`
      });
    }
    
    return res.json({
      success: true,
      message: "User updated successfully",
      data: result[0]
    });
    
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to update user"
    });
  }
});

// ==================== PATIENT MANAGEMENT ====================

/**
 * GET /api/patients
 * Get all patients
 */
app.get("/api/patients", async (req, res) => {
  try {
    // Only admin, doctor, and receptionist can view patients
    const allowedRoles = ['admin', 'doctor', 'receptionist'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You don't have permission to view patients"
      });
    }
    
    const { 
      search, gender, page = 1, limit = 20 
    } = req.query;
    
    // Build query
    let query = `
      SELECT id, full_name, gender, date_of_birth, phone, email,
             address, emergency_contact, blood_type, allergies,
             created_at, updated_at
      FROM patients
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (search) {
      query += ` AND (full_name ILIKE $${paramCount} OR phone ILIKE $${paramCount + 1} OR email ILIKE $${paramCount + 2})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramCount += 3;
    }
    
    if (gender) {
      query += ` AND gender = $${paramCount}`;
      params.push(gender);
      paramCount++;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);
    
    const patients = await queryDatabase(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM patients WHERE 1=1`;
    const countParams = [];
    paramCount = 1;
    
    if (search) {
      countQuery += ` AND (full_name ILIKE $${paramCount} OR phone ILIKE $${paramCount + 1} OR email ILIKE $${paramCount + 2})`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
      paramCount += 3;
    }
    
    if (gender) {
      countQuery += ` AND gender = $${paramCount}`;
      countParams.push(gender);
    }
    
    const countResult = await queryDatabase(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    return res.json({
      success: true,
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error("Get patients error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch patients"
    });
  }
});

/**
 * POST /api/patients
 * Register new patient
 */
app.post("/api/patients", async (req, res) => {
  try {
    // Only admin, doctor, and receptionist can register patients
    const allowedRoles = ['admin', 'doctor', 'receptionist'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You don't have permission to register patients"
      });
    }
    
    const {
      full_name, gender, date_of_birth, phone, email,
      address, emergency_contact, blood_type, allergies
    } = req.body;
    
    // Validate required fields
    if (!full_name || !gender || !date_of_birth || !phone) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Full name, gender, date of birth, and phone are required"
      });
    }
    
    // Check if phone already exists
    const existingPatient = await queryDatabase(
      "SELECT id FROM patients WHERE phone = $1",
      [phone]
    );
    
    if (existingPatient.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Conflict",
        message: "Patient with this phone number already exists"
      });
    }
    
    // Insert patient
    const result = await queryDatabase(
      `INSERT INTO patients (
        full_name, gender, date_of_birth, phone, email,
        address, emergency_contact, blood_type, allergies
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        full_name, gender, date_of_birth, phone, email || null,
        address || null, emergency_contact || null, 
        blood_type || null, allergies || null
      ]
    );
    
    const newPatient = result[0];
    
    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: newPatient
    });
    
  } catch (error) {
    console.error("Create patient error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to register patient"
    });
  }
});

// ==================== APPOINTMENT MANAGEMENT ====================

/**
 * GET /api/appointments
 * Get appointments with filters
 */
app.get("/api/appointments", async (req, res) => {
  try {
    const { 
      date, doctor_id, status, patient_id, 
      page = 1, limit = 20 
    } = req.query;
    
    // Build query
    let query = `
      SELECT a.*, 
             p.full_name as patient_name,
             p.phone as patient_phone,
             u.name as doctor_name,
             u.specialization as doctor_specialization
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    // Apply filters based on user role
    if (req.user.role === 'doctor') {
      query += ` AND a.doctor_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    } else if (req.user.role === 'patient') {
      query += ` AND a.patient_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    }
    
    if (date) {
      query += ` AND DATE(a.appointment_date) = $${paramCount}`;
      params.push(date);
      paramCount++;
    }
    
    if (doctor_id && req.user.role === 'admin') {
      query += ` AND a.doctor_id = $${paramCount}`;
      params.push(doctor_id);
      paramCount++;
    }
    
    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (patient_id && (req.user.role === 'admin' || req.user.role === 'receptionist')) {
      query += ` AND a.patient_id = $${paramCount}`;
      params.push(patient_id);
      paramCount++;
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY a.appointment_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);
    
    const appointments = await queryDatabase(query, params);
    
    return res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: appointments.length // Simplified - should add count query
      }
    });
    
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch appointments"
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
    database: "healthcare_db",
    environment: NODE_ENV,
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
    const result = await queryDatabase(
      "SELECT NOW() as time, current_database() as database, version() as version"
    );
    
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
 * GET /me (Compatibility endpoint)
 */
app.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Authentication required" });
  }
  
  res.json({ 
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      department: req.user.department,
      specialization: req.user.specialization
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
      ...(NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  res.status(500).send("500 - Internal Server Error");
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📚 Database: ${process.env.DB_NAME || 'healthcare_db'}`);
  console.log(`🔐 Authentication: Session + JWT`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔄 CORS Origin: ${corsOptions.origin}`);
});