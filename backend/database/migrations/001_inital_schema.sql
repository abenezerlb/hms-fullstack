/*
Initial Database Schema Migration
Version: 1.0.0
Description: Creates all core tables for the Healthcare Management System
This is the first migration that sets up the complete database structure.
*/

-- Enable UUID extension if not already enabled
-- UUIDs are better than sequential IDs for security and distributed systems
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Hospital Staff)
-- Stores doctors, receptionists, administrators, and lab technicians
-- Role-based access control is implemented through the 'role' field
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist', 'lab_technician')),
    specialization VARCHAR(100), -- Only for doctors (e.g., Cardiology, Pediatrics)
    phone VARCHAR(20),
    department VARCHAR(100), -- Which department the staff belongs to
    is_active BOOLEAN DEFAULT TRUE, -- Soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Table
-- Stores all patient demographic and contact information
-- Phone is unique to prevent duplicate patient records
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE NOT NULL, -- Used to calculate age
    phone VARCHAR(20) UNIQUE NOT NULL, -- Ethiopian format: +251911234567
    email VARCHAR(100),
    address TEXT, -- Full address in Ethiopia (city, sub-city, woreda)
    emergency_contact VARCHAR(20), -- Emergency contact number
    blood_type VARCHAR(5), -- Blood type (A+, O-, AB+, etc.)
    allergies TEXT, -- Comma-separated allergies
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Appointments Table
-- Manages all patient appointments with doctors
-- Status transitions: scheduled → confirmed → checked-in → in-progress → completed
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP NOT NULL, -- Date and time of appointment
    appointment_type VARCHAR(50) DEFAULT 'consultation', -- consultation, follow-up, emergency
    status VARCHAR(20) DEFAULT 'scheduled' 
        CHECK (status IN ('scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show')),
    reason TEXT, -- Patient's reason for visit
    notes TEXT, -- Additional notes from receptionist
    duration_minutes INTEGER DEFAULT 30, -- Appointment duration in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Medical Records (EHR) Table
-- Electronic Health Records for patients
-- Each record is linked to an appointment and a doctor
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id), -- Optional link to appointment
    symptoms TEXT, -- Patient-reported symptoms
    diagnosis TEXT, -- Doctor's diagnosis
    prescription TEXT, -- Prescribed medications
    notes TEXT, -- Clinical notes
    temperature DECIMAL(4,2), -- Body temperature in Celsius
    blood_pressure VARCHAR(20), -- Format: "120/80"
    weight DECIMAL(5,2), -- Weight in kg
    height DECIMAL(5,2), -- Height in cm
    follow_up_date DATE, -- Date for follow-up appointment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);