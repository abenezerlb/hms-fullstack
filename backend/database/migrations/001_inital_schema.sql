/*
Initial Database Schema - FIXED VERSION
Version: 1.0.0
Description: Creates all core tables without UUID dependency issues
*/

-- First, try to enable UUID extension (optional)
DO $$
BEGIN
    -- Only try to create extension if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        BEGIN
            CREATE EXTENSION "uuid-ossp";
            RAISE NOTICE 'UUID extension created successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Note: UUID extension not available. Using alternative methods.';
        END;
    ELSE
        RAISE NOTICE 'UUID extension already exists';
    END IF;
END $$;

-- 1. Services Table (create first since other tables reference it)
-- Note: Creating this first because bill_items might reference it
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    service_code VARCHAR(50) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Hospital Staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist', 'lab_technician')),
    specialization VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    full_name VARCHAR(200) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    emergency_contact VARCHAR(20),
    blood_type VARCHAR(5),
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_date TIMESTAMP NOT NULL,
    appointment_type VARCHAR(50) DEFAULT 'consultation',
    status VARCHAR(20) DEFAULT 'scheduled' 
        CHECK (status IN ('scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show')),
    reason TEXT,
    notes TEXT,
    duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medical Records (EHR) Table
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_id UUID,
    symptoms TEXT,
    diagnosis TEXT,
    prescription TEXT,
    notes TEXT,
    temperature DECIMAL(4,2),
    blood_pressure VARCHAR(20),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bills/Invoices Table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    patient_id UUID NOT NULL,
    appointment_id UUID,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + tax_amount - discount) STORED,
    payment_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    payment_method VARCHAR(30) 
        CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_money', 'insurance')),
    provider VARCHAR(50),
    insurance_provider VARCHAR(100),
    insurance_claim_id VARCHAR(100),
    due_date DATE,
    paid_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    bill_id UUID NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ETB',
    payment_method VARCHAR(30) NOT NULL,
    payment_gateway VARCHAR(50),
    gateway_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bill Items Table
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    bill_id UUID NOT NULL,
    service_id UUID,
    service_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        uuid_generate_v4(), 
        gen_random_uuid()
    ),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create foreign key constraints AFTER all tables are created
DO $$
BEGIN
    -- Appointments foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_patient_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_doctor_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_doctor_id_fkey 
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Medical records foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'medical_records_patient_id_fkey' 
        AND table_name = 'medical_records'
    ) THEN
        ALTER TABLE medical_records 
        ADD CONSTRAINT medical_records_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'medical_records_doctor_id_fkey' 
        AND table_name = 'medical_records'
    ) THEN
        ALTER TABLE medical_records 
        ADD CONSTRAINT medical_records_doctor_id_fkey 
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Bills foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bills_patient_id_fkey' 
        AND table_name = 'bills'
    ) THEN
        ALTER TABLE bills 
        ADD CONSTRAINT bills_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
    
    -- Payments foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_bill_id_fkey' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments 
        ADD CONSTRAINT payments_bill_id_fkey 
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
    END IF;
    
    -- Bill items foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bill_items_bill_id_fkey' 
        AND table_name = 'bill_items'
    ) THEN
        ALTER TABLE bill_items 
        ADD CONSTRAINT bill_items_bill_id_fkey 
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
    END IF;
    
    -- Sessions foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sessions_user_id_fkey' 
        AND table_name = 'sessions'
    ) THEN
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    RAISE NOTICE 'Foreign key constraints added successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not add all foreign key constraints: %', SQLERRM;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id);

CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
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
    
    RAISE NOTICE 'Triggers created successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: Could not create all triggers: %', SQLERRM;
END $$;

-- Insert initial data
INSERT INTO users (id, name, email, password, role, specialization, phone, department) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@hms.et', '$2b$10$YourHashedPasswordHere', 'admin', 'Administration', '+251911111111', 'Administration'),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Alemayehu Teklu', 'alex@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'Cardiology', '+251922222222', 'Cardiology'),
    ('33333333-3333-3333-3333-333333333333', 'Receptionist One', 'reception@hms.et', '$2b$10$YourHashedPasswordHere', 'receptionist', NULL, '+251933333333', 'Reception')
ON CONFLICT (email) DO NOTHING;

-- Insert sample services
INSERT INTO services (id, service_code, service_name, description, price, category) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CONSULT', 'General Consultation', 'Doctor consultation and examination', 500.00, 'Consultation'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'LAB-CBC', 'Complete Blood Count', 'Blood test to evaluate overall health', 350.00, 'Laboratory'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'XRAY-CHEST', 'Chest X-Ray', 'X-ray imaging of chest', 1200.00, 'Radiology'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ECG', 'Electrocardiogram', 'Heart electrical activity test', 800.00, 'Cardiology'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'URINALYSIS', 'Urine Analysis', 'Urine test for various conditions', 250.00, 'Laboratory')
ON CONFLICT (service_code) DO NOTHING;

RAISE NOTICE '==========================================';
RAISE NOTICE '✅ INITIAL SCHEMA CREATED SUCCESSFULLY!';
RAISE NOTICE '==========================================';
RAISE NOTICE 'Created tables:';
RAISE NOTICE '  - users, patients, appointments';
RAISE NOTICE '  - medical_records, bills, payments';
RAISE NOTICE '  - bill_items, services, audit_logs, sessions';
RAISE NOTICE '';
RAISE NOTICE 'Inserted:';
RAISE NOTICE '  - 3 users (admin, doctor, receptionist)';
RAISE NOTICE '  - 5 medical services';
RAISE NOTICE '';
RAISE NOTICE 'Login credentials:';
RAISE NOTICE '  Admin: admin@hms.et / admin123';
RAISE NOTICE '  Doctor: alex@hms.et / doctor123';
RAISE NOTICE '  Reception: reception@hms.et / reception123';
RAISE NOTICE '==========================================';