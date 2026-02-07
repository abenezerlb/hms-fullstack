const Joi = require('joi');

/**
 * Input Validation Middleware
 * Uses Joi for schema validation
 */

/**
 * Generic validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        try {
            const { error, value } = schema.validate(req[property], {
                abortEarly: false, // Return all errors, not just first
                stripUnknown: true, // Remove unknown fields
                convert: true // Convert types where possible
            });
            
            if (error) {
                // Format validation errors
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    type: detail.type
                }));
                
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    message: "Please check your input data.",
                    details: errors
                });
            }
            
            // Replace request data with validated data
            req[property] = value;
            next();
            
        } catch (error) {
            console.error('Validation Middleware Error:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
                message: "Validation failed due to server error."
            });
        }
    };
};

/**
 * Common validation schemas for reuse
 */
const schemas = {
    // User schemas
    userCreate: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid('admin', 'doctor', 'receptionist', 'lab_technician').required(),
        specialization: Joi.string().max(100).optional(),
        phone: Joi.string().pattern(/^\+?[0-9\s\-\(\)]+$/).optional(),
        department: Joi.string().max(100).optional(),
        is_active: Joi.boolean().optional()
    }),
    
    userUpdate: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        email: Joi.string().email().optional(),
        specialization: Joi.string().max(100).optional(),
        phone: Joi.string().pattern(/^\+?[0-9\s\-\(\)]+$/).optional(),
        department: Joi.string().max(100).optional(),
        is_active: Joi.boolean().optional()
    }).min(1), // At least one field required
    
    userPassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(6).required()
    }),
    
    // Patient schemas
    patientCreate: Joi.object({
        full_name: Joi.string().min(2).max(200).required(),
        gender: Joi.string().valid('male', 'female', 'other').required(),
        date_of_birth: Joi.date().max('now').required(),
        phone: Joi.string().pattern(/^\+?[0-9\s\-\(\)]+$/).required(),
        email: Joi.string().email().optional(),
        address: Joi.string().optional(),
        emergency_contact: Joi.string().pattern(/^\+?[0-9\s\-\(\)]+$/).optional(),
        blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
        allergies: Joi.string().optional()
    }),
    
    patientUpdate: Joi.object({
        full_name: Joi.string().min(2).max(200).optional(),
        gender: Joi.string().valid('male', 'female', 'other').optional(),
        date_of_birth: Joi.date().max('now').optional(),
        phone: Joi.string().pattern(/^\+?[0-9\s\-\(\)]+$/).optional(),
        email: Joi.string().email().optional(),
        address: Joi.string().optional(),
        emergency_contact: Joi.string().pattern(/^\+?[0-9\s\-\(\)]+$/).optional(),
        blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
        allergies: Joi.string().optional()
    }).min(1),
    
    // Appointment schemas
    appointmentCreate: Joi.object({
        patient_id: Joi.string().uuid().required(),
        doctor_id: Joi.string().uuid().required(),
        appointment_date: Joi.date().iso().required(),
        appointment_type: Joi.string().valid('consultation', 'follow-up', 'emergency', 'surgery', 'test').default('consultation'),
        reason: Joi.string().optional(),
        notes: Joi.string().optional(),
        duration_minutes: Joi.number().integer().min(5).max(240).default(30)
    }),
    
    appointmentStatus: Joi.object({
        status: Joi.string().valid('scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show').required()
    }),
    
    // Medical Record schemas
    medicalRecordCreate: Joi.object({
        patient_id: Joi.string().uuid().required(),
        doctor_id: Joi.string().uuid().required(),
        appointment_id: Joi.string().uuid().optional(),
        symptoms: Joi.string().required(),
        diagnosis: Joi.string().required(),
        prescription: Joi.string().optional(),
        notes: Joi.string().optional(),
        temperature: Joi.number().min(30).max(45).optional(),
        blood_pressure: Joi.string().pattern(/^\d{2,3}\/\d{2,3}$/).optional(),
        weight: Joi.number().min(1).max(300).optional(),
        height: Joi.number().min(30).max(250).optional(),
        follow_up_date: Joi.date().iso().optional()
    }),
    
    // Bill schemas
    billCreate: Joi.object({
        patient_id: Joi.string().uuid().required(),
        appointment_id: Joi.string().uuid().optional(),
        items: Joi.array().items(
            Joi.object({
                service_id: Joi.string().uuid().optional(),
                service_name: Joi.string().when('service_id', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.required()
                }),
                quantity: Joi.number().integer().min(1).default(1),
                unit_price: Joi.number().min(0).when('service_id', {
                    is: Joi.exist(),
                    then: Joi.optional(),
                    otherwise: Joi.required()
                })
            })
        ).min(1).required(),
        discount: Joi.number().min(0).default(0),
        due_date: Joi.date().iso().optional(),
        notes: Joi.string().optional(),
        insurance_provider: Joi.string().optional(),
        insurance_claim_id: Joi.string().optional()
    }),
    
    billStatus: Joi.object({
        payment_status: Joi.string().valid('pending', 'partially_paid', 'paid', 'cancelled', 'refunded').required(),
        payment_method: Joi.string().valid('cash', 'card', 'bank_transfer', 'mobile_money', 'insurance').optional(),
        paid_date: Joi.date().iso().optional()
    }),
    
    // Payment schemas
    paymentInitiate: Joi.object({
        bill_id: Joi.string().uuid().required(),
        payment_method: Joi.string().valid('cash', 'card', 'bank_transfer', 'mobile_money', 'insurance').required(),
        provider: Joi.string().valid('telebirr', 'cbebirr', 'hellocash', 'amole').default('telebirr'),
        phone: Joi.string().when('payment_method', {
            is: 'mobile_money',
            then: Joi.string().pattern(/^\+?251[0-9]{9}$/).required(),
            otherwise: Joi.optional()
        })
    }),
    
    // Service schemas
    serviceCreate: Joi.object({
        service_code: Joi.string().pattern(/^[A-Z0-9\-]+$/).required(),
        service_name: Joi.string().min(2).max(200).required(),
        description: Joi.string().optional(),
        price: Joi.number().min(0).required(),
        category: Joi.string().optional(),
        duration_minutes: Joi.number().integer().min(1).max(480).default(30),
        is_active: Joi.boolean().default(true)
    }),
    
    // Auth schemas
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),
    
    refreshToken: Joi.object({
        token: Joi.string().required()
    }),
    
    // Query parameter schemas
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    }),
    
    // UUID validation for params
    uuidParam: Joi.object({
        id: Joi.string().uuid().required()
    })
};

/**
 * Ethiopian phone number validation
 */
const ethiopianPhoneSchema = Joi.string()
    .pattern(/^\+?251[0-9]{9}$/)
    .message('Please enter a valid Ethiopian phone number (e.g., +251911234567)');

/**
 * Ethiopian date validation (simple)
 */
const ethiopianDateSchema = Joi.string()
    .pattern(/^\d{1,2}\s+[መጋቢት|ሚያዚያ|ግንቦት|ሰኔ|ሐምሌ|ነሐሴ|መስከረም|ጥቅምት|ህዳር|ታህሳስ|ጥር|የካቲት]+\s+\d{4}$/)
    .message('Please enter a valid Ethiopian date');

module.exports = {
    validate,
    schemas,
    ethiopianPhoneSchema,
    ethiopianDateSchema
};