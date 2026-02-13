-- Initial Seed Data for HMS
-- This file contains safe, idempotent seed data

-- Users (with realistic hashed passwords - use bcrypt in app)
INSERT INTO users (id, name, email, role, specialization, phone, department) VALUES
    ('11111111-1111-1111-1111-111111111111', 
     'Admin User', 
     'admin@hms.et', 
     'admin', 
     'Administration', 
     '+251911111111', 
     'Administration'),
    
    ('22222222-2222-2222-2222-222222222222', 
     'Dr. Alemayehu Teklu', 
     'alex@hms.et', 
     'doctor', 
     'Cardiology', 
     '+251922222222', 
     'Cardiology'),
    
    ('33333333-3333-3333-3333-333333333333', 
     'Receptionist One', 
     'reception@hms.et', 
     'receptionist', 
     NULL, 
     '+251933333333', 
     'Reception')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    specialization = EXCLUDED.specialization,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department;

-- Services
INSERT INTO services (service_code, service_name, description, price, category, duration_minutes) VALUES
    ('CONSULT', 'General Consultation', 'Doctor consultation and examination', 500.00, 'Consultation', 30),
    ('LAB-CBC', 'Complete Blood Count', 'Full blood count test', 350.00, 'Laboratory', 15),
    ('XRAY-CHEST', 'Chest X-Ray', 'Chest radiography', 1200.00, 'Radiology', 45),
    ('ECG', 'Electrocardiogram', 'Heart electrical activity test', 800.00, 'Cardiology', 30),
    ('URINALYSIS', 'Urine Analysis', 'Complete urine examination', 250.00, 'Laboratory', 15),
    ('MRI-BRAIN', 'MRI Brain Scan', 'Magnetic Resonance Imaging of brain', 5000.00, 'Radiology', 60),
    ('PHYSIO', 'Physical Therapy', '30-minute therapy session', 600.00, 'Therapy', 30)
ON CONFLICT (service_code) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    price = EXCLUDED.price,
    category = EXCLUDED.category;

-- Sample Patients
INSERT INTO patients (full_name, gender, date_of_birth, phone, email, address, emergency_contact, blood_type, allergies) VALUES
    ('Mekdes Abebe', 'female', '1990-05-15', '+251911234567', 'mekdes@email.com', 'Addis Ababa, Bole', '+251912345678', 'O+', 'Penicillin'),
    ('Yohannes Girma', 'male', '1985-11-22', '+251912345678', 'yohannes@email.com', 'Addis Ababa, Kazanchis', '+251911111111', 'A+', 'None'),
    ('Selamawit Bekele', 'female', '1995-03-08', '+251913456789', 'selam@email.com', 'Addis Ababa, Mexico', '+251914567890', 'B+', 'Sulfa drugs')
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    address = EXCLUDED.address;

-- Audit log entry for setup
INSERT INTO audit_logs (action, table_name, record_id, new_values) VALUES
    ('SYSTEM_SETUP', 'database', '00000000-0000-0000-0000-000000000000', 
     '{"version": "1.0.0", "timestamp": "' || CURRENT_TIMESTAMP || '"}');