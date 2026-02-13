/*
Seed Data Migration
Version: 1.0.0
Description: Populates the database with initial sample data for development and testing
This migration should be run after the schema is created.
*/

-- IMPORTANT: This is sample data for development/testing only.
-- In production, you should use different, secure data.

-- =============================================
-- INSERT SAMPLE USERS (Hospital Staff)
-- =============================================

-- Note: Passwords are hashed versions of 'password123'
-- In a real system, use environment variables for default passwords
INSERT INTO users (id, name, email, password, role, specialization, phone, department) VALUES
-- Admin users
('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@hms.et', '$2b$10$YourHashedPasswordHere', 'admin', 'Administration', '+251911111111', 'Administration'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'System Admin', 'sysadmin@hms.et', '$2b$10$YourHashedPasswordHere', 'admin', 'System Administration', '+251911111112', 'IT'),

-- Doctors (Cardiology Department)
('22222222-2222-2222-2222-222222222222', 'Dr. Alemayehu Teklu', 'alex@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'Cardiology', '+251922222222', 'Cardiology'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dr. Selamawit Bekele', 'selam@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'Cardiology', '+251922222223', 'Cardiology'),

-- Doctors (Pediatrics Department)
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dr. Kidist Wolde', 'kidist@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'Pediatrics', '+251922222224', 'Pediatrics'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dr. Tesfaye Girma', 'tesfaye@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'General Medicine', '+251922222225', 'OPD'),

-- Receptionists
('33333333-3333-3333-3333-333333333333', 'Receptionist One', 'reception@hms.et', '$2b$10$YourHashedPasswordHere', 'receptionist', NULL, '+251933333333', 'Reception'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Receptionist Two', 'reception2@hms.et', '$2b$10$YourHashedPasswordHere', 'receptionist', NULL, '+251933333334', 'Reception'),

-- Lab Technicians
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Lab Tech One', 'lab@hms.et', '$2b$10$YourHashedPasswordHere', 'lab_technician', 'Laboratory', '+251944444444', 'Laboratory'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'Lab Tech Two', 'lab2@hms.et', '$2b$10$YourHashedPasswordHere', 'lab_technician', 'Laboratory', '+251944444445', 'Laboratory')

ON CONFLICT (email) DO NOTHING; -- Skip if user already exists

-- =============================================
-- INSERT SAMPLE PATIENTS
-- =============================================

INSERT INTO patients (id, full_name, gender, date_of_birth, phone, email, address, emergency_contact, blood_type, allergies) VALUES
-- Patient 1
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Mekdes Abebe', 'female', '1990-05-15', '+251911234567', 'mekdes@email.com', 'Addis Ababa, Bole', '+251912345678', 'O+', 'Penicillin, Peanuts'),
-- Patient 2
('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'Abebe Kebede', 'male', '1985-08-22', '+251912345678', 'abebe@email.com', 'Addis Ababa, Kazanchis', '+251911111111', 'A+', 'None'),
-- Patient 3
('cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa', 'Selamawit Girma', 'female', '1995-03-10', '+251913456789', 'selam@email.com', 'Addis Ababa, Mexico', '+251912222222', 'B+', 'Sulfa drugs'),
-- Patient 4
('dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb', 'Yohannes Tesfaye', 'male', '1978-11-30', '+251914567890', 'yohannes@email.com', 'Addis Ababa, Kirkos', '+251913333333', 'AB+', 'Latex'),
-- Patient 5
('eeeeeeee-ffff-aaaa-bbbb-cccccccccccc', 'Hanna Michael', 'female', '2000-01-25', '+251915678901', 'hanna@email.com', 'Addis Ababa, Nifas Silk', '+251914444444', 'O-', 'Iodine contrast'),
-- Patient 6
('ffffffff-aaaa-bbbb-cccc-dddddddddddd', 'Daniel Assefa', 'male', '1992-07-18', '+251916789012', 'daniel@email.com', 'Addis Ababa, Bole', '+251915555555', 'A-', 'Aspirin'),
-- Patient 7
('aaaaaaa1-bbbb-cccc-dddd-eeeeeeeeeeee', 'Kalkidan Solomon', 'female', '1988-12-05', '+251917890123', 'kalkidan@email.com', 'Addis Ababa, Gullele', '+251916666666', 'B-', 'Bee stings'),
-- Patient 8
('bbbbbbb1-cccc-dddd-eeee-ffffffffffff', 'Mulugeta Haile', 'male', '1975-04-20', '+251918901234', 'mulu@email.com', 'Addis Ababa, Lideta', '+251917777777', 'AB-', 'Shellfish')

ON CONFLICT (phone) DO NOTHING; -- Skip if patient with same phone already exists

-- =============================================
-- INSERT SAMPLE SERVICES (if not already inserted)
-- =============================================

INSERT INTO services (service_code, service_name, description, price, category, duration_minutes) VALUES
('CONSULT', 'General Consultation', 'Doctor consultation and examination', 500.00, 'Consultation', 30),
('SPEC-CONSULT', 'Specialist Consultation', 'Consultation with a specialist doctor', 800.00, 'Consultation', 45),
('EMERG-CONSULT', 'Emergency Consultation', 'Emergency room consultation', 1000.00, 'Emergency', 60),
('LAB-CBC', 'Complete Blood Count', 'Blood test to evaluate overall health', 350.00, 'Laboratory', 15),
('LAB-GLUCOSE', 'Blood Glucose Test', 'Blood sugar level test', 200.00, 'Laboratory', 15),
('LAB-LIPID', 'Lipid Profile', 'Cholesterol and triglycerides test', 450.00, 'Laboratory', 15),
('XRAY-CHEST', 'Chest X-Ray', 'X-ray imaging of chest', 1200.00, 'Radiology', 30),
('XRAY-LEG', 'Leg X-Ray', 'X-ray imaging of leg', 1000.00, 'Radiology', 30),
('ULTRASOUND', 'Ultrasound Scan', 'Ultrasound imaging', 1500.00, 'Radiology', 45),
('MRI-BRAIN', 'MRI Brain Scan', 'Magnetic Resonance Imaging of brain', 5000.00, 'Radiology', 60),
('ECG', 'Electrocardiogram', 'Heart electrical activity test', 800.00, 'Cardiology', 30),
('ECHO', 'Echocardiogram', 'Ultrasound of the heart', 2000.00, 'Cardiology', 45),
('URINALYSIS', 'Urine Analysis', 'Urine test for various conditions', 250.00, 'Laboratory', 15),
('PHYSIO', 'Physiotherapy Session', 'Physical therapy session', 700.00, 'Therapy', 60),
('INJECTION', 'Injection/IV', 'Medication injection or IV therapy', 150.00, 'Treatment', 15)

ON CONFLICT (service_code) DO NOTHING; -- Skip if service already exists

-- =============================================
-- INSERT SAMPLE APPOINTMENTS
-- =============================================

-- Note: Using yesterday, today, and tomorrow dates for variety
INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, appointment_type, status, reason, duration_minutes) VALUES
-- Yesterday's completed appointments
('aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 
 CURRENT_DATE - INTERVAL '1 day' + TIME '09:00', 'consultation', 'completed', 'Routine checkup and blood pressure monitoring', 30),
('bbbbbbbb-1111-2222-3333-cccccccccccc', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 
 CURRENT_DATE - INTERVAL '1 day' + TIME '10:30', 'consultation', 'completed', 'Child vaccination and growth monitoring', 30),

-- Today's appointments (mixed statuses)
('cccccccc-1111-2222-3333-dddddddddddd', 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 
 CURRENT_DATE + TIME '09:00', 'consultation', 'checked-in', 'Fever and sore throat', 30),
('dddddddd-1111-2222-3333-eeeeeeeeeeee', 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 
 CURRENT_DATE + TIME '10:00', 'follow-up', 'confirmed', 'Follow-up after heart surgery', 45),
('eeeeeeee-1111-2222-3333-ffffffffffff', 'eeeeeeee-ffff-aaaa-bbbb-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
 CURRENT_DATE + TIME '11:00', 'consultation', 'scheduled', 'Chest pain evaluation', 30),
('ffffffff-1111-2222-3333-aaaaaaaaaaaa', 'ffffffff-aaaa-bbbb-cccc-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 
 CURRENT_DATE + TIME '14:00', 'consultation', 'scheduled', 'Pediatric allergy testing', 30),

-- Tomorrow's appointments
('aaaaaaa1-1111-2222-3333-bbbbbbbbbbbb', 'aaaaaaa1-bbbb-cccc-dddd-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 
 CURRENT_DATE + INTERVAL '1 day' + TIME '09:30', 'consultation', 'scheduled', 'Diabetes management', 30),
('bbbbbbb1-1111-2222-3333-cccccccccccc', 'bbbbbbb1-cccc-dddd-eeee-ffffffffffff', '22222222-2222-2222-2222-222222222222', 
 CURRENT_DATE + INTERVAL '1 day' + TIME '11:00', 'follow-up', 'scheduled', 'Cardiac rehabilitation', 45)

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- INSERT SAMPLE MEDICAL RECORDS
-- =============================================

INSERT INTO medical_records (id, patient_id, doctor_id, appointment_id, symptoms, diagnosis, prescription, notes, temperature, blood_pressure, weight, height, follow_up_date) VALUES
-- Record for Mekdes Abebe (yesterday's appointment)
('aaaaaaaa-2222-3333-4444-aaaaaaaaaaaa', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222',
 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', 'Fatigue, mild headache, occasional dizziness', 'Mild hypertension', 
 'Lifestyle modifications: reduce salt intake, regular exercise. Medication: Amlodipine 5mg once daily', 
 'Patient advised to monitor BP at home. Follow up in 1 month.', 36.8, '138/88', 65.5, 170.0, CURRENT_DATE + INTERVAL '30 days'),

-- Record for Abebe Kebede (yesterday's appointment)
('bbbbbbbb-2222-3333-4444-bbbbbbbbbbbb', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'bbbbbbbb-1111-2222-3333-cccccccccccc', 'Fever, runny nose, cough for 3 days', 'Viral upper respiratory infection',
 'Rest, hydration, paracetamol 500mg every 6 hours as needed for fever', 
 'Child recovering well. Advised to return if fever persists beyond 3 days.', 38.2, '110/70', 22.5, 110.0, NULL)

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- INSERT SAMPLE BILLS
-- =============================================

INSERT INTO bills (id, patient_id, appointment_id, bill_number, amount, tax_amount, discount, payment_status, payment_method, due_date) VALUES
-- Bill for Mekdes Abebe (paid)
('aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
 'INV-' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYYMMDD') || '-001', 850.00, 127.50, 0.00, 'paid', 'mobile_money', CURRENT_DATE + INTERVAL '7 days'),

-- Bill for Abebe Kebede (pending)
('bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', 'bbbbbbbb-1111-2222-3333-cccccccccccc',
 'INV-' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYYMMDD') || '-002', 600.00, 90.00, 50.00, 'pending', NULL, CURRENT_DATE + INTERVAL '7 days')

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- INSERT SAMPLE BILL ITEMS
-- =============================================

INSERT INTO bill_items (id, bill_id, service_id, service_name, quantity, unit_price) VALUES
-- Items for Mekdes Abebe's bill
('aaaaaaaa-4444-5555-6666-aaaaaaaaaaaa', 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa', 
 (SELECT id FROM services WHERE service_code = 'CONSULT'), 'General Consultation', 1, 500.00),
('bbbbbbbb-4444-5555-6666-bbbbbbbbbbbb', 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa',
 (SELECT id FROM services WHERE service_code = 'LAB-CBC'), 'Complete Blood Count', 1, 350.00),

-- Items for Abebe Kebede's bill
('cccccccc-4444-5555-6666-cccccccccccc', 'bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb',
 (SELECT id FROM services WHERE service_code = 'CONSULT'), 'General Consultation', 1, 500.00),
('dddddddd-4444-5555-6666-dddddddddddd', 'bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb',
 (SELECT id FROM services WHERE service_code = 'INJECTION'), 'Injection/IV', 1, 150.00)

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- INSERT SAMPLE PAYMENTS
-- =============================================

INSERT INTO payments (id, bill_id, transaction_id, amount, currency, payment_method, payment_gateway, status, metadata) VALUES
-- Payment for Mekdes Abebe's bill
('aaaaaaaa-5555-6666-7777-aaaaaaaaaaaa', 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa',
 'TXN-' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYYMMDD') || '-001', 977.50, 'ETB', 'mobile_money', 'telebirr', 'completed',
 '{"phone": "+251911234567", "provider": "telebirr", "receipt_number": "REC001"}'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- UPDATE BILL PAID DATE FOR PAID BILL
-- =============================================

UPDATE bills 
SET paid_date = CURRENT_DATE - INTERVAL '1 day' + TIME '14:30:00'
WHERE id = 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa';

-- =============================================
-- INSERT SAMPLE AUDIT LOG ENTRIES (for demonstration)
-- =============================================

INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, user_agent) VALUES
('11111111-1111-1111-1111-111111111111', 'LOGIN', NULL, NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('22222222-2222-2222-2222-222222222222', 'CREATE', 'medical_records', 'aaaaaaaa-2222-3333-4444-aaaaaaaaaaaa', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

ON CONFLICT (id) DO NOTHING;

-- =============================================
-- CREATE SCHEMA VERSION TABLE (for tracking migrations)
-- =============================================

CREATE TABLE IF NOT EXISTS schema_version (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO schema_version (version, description) VALUES 
('1.0.0', 'Initial schema and seed data migration');

-- =============================================
-- FINAL MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Seed data migration completed successfully!';
    RAISE NOTICE 'Sample data inserted for:';
    RAISE NOTICE '  - 10 Users (2 admins, 4 doctors, 2 receptionists, 2 lab technicians)';
    RAISE NOTICE '  - 8 Patients';
    RAISE NOTICE '  - 15 Medical Services';
    RAISE NOTICE '  - 8 Appointments';
    RAISE NOTICE '  - 2 Medical Records';
    RAISE NOTICE '  - 2 Bills with 4 bill items';
    RAISE NOTICE '  - 1 Payment transaction';
    RAISE NOTICE '  - 2 Audit log entries';
END $$;