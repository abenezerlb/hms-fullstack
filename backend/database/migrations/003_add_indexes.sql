/*
Audit Logs, Indexes, and Triggers Migration
Version: 1.0.0
Description: Adds audit trail, performance indexes, and automatic timestamps
This migration enhances security, performance, and data integrity.
*/

-- 9. Audit Log Table
-- Tracks all important system activities for security and compliance
-- Required for healthcare regulations (HIPAA, GDPR, etc.)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- Who performed the action
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    table_name VARCHAR(50), -- Which table was affected
    record_id UUID, -- ID of the affected record
    old_values JSONB, -- Previous values (for UPDATE)
    new_values JSONB, -- New values (for CREATE/UPDATE)
    ip_address INET, -- IP address of the user
    user_agent TEXT, -- Browser/device information
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Sessions Table
-- Manages user sessions for authentication
-- Stores session data for JWT token validation
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY, -- Session ID (JWT token)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL, -- Unix timestamp when session expires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email); -- Fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role); -- Filter by role
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department); -- Department queries

-- Patients table indexes
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone); -- Search by phone
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name); -- Search by name
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at); -- New patients report

-- Appointments table indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id); -- Patient history
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id); -- Doctor schedule
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date); -- Daily appointments
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status); -- Filter by status
CREATE INDEX IF NOT EXISTS idx_appointments_composite ON appointments(doctor_id, appointment_date, status); -- Availability queries

-- Medical records indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id); -- Patient medical history
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id); -- Doctor's patients
CREATE INDEX IF NOT EXISTS idx_medical_records_created_at ON medical_records(created_at); -- Recent records

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON bills(patient_id); -- Patient bills
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status); -- Outstanding payments
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number); -- Invoice lookup
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at); -- Financial reports

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id); -- Bill payments
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status); -- Payment status filter
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at); -- Daily payments report

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id); -- User sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at); -- Cleanup expired sessions

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Function to automatically update updated_at timestamp
-- This function is called by triggers before UPDATE operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Set updated_at to current timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Users table trigger
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Patients table trigger
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Appointments table trigger
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Medical records trigger
CREATE TRIGGER update_medical_records_updated_at 
    BEFORE UPDATE ON medical_records
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Bills table trigger
CREATE TRIGGER update_bills_updated_at 
    BEFORE UPDATE ON bills
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Payments table trigger
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sessions table trigger
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();