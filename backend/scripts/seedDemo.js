/**
 * Demo Data Seeding Script
 * 
 * This script seeds the database with a complete demo dataset
 * for presentations, demonstrations, and testing.
 * 
 * Features:
 * 1. Creates a complete, coherent demo scenario
 * 2. Includes sample patients with realistic medical histories
 * 3. Sets up sample appointments, bills, and payments
 * 4. Creates demo users with different roles
 * 
 * Usage: node scripts/seedDemo.js [options]
 * Options:
 *   --reset     Reset database before seeding
 *   --quick     Quick seed (minimal data)
 *   --full      Full seed (comprehensive data)
 */

const { query, getClient } = require('../database/connection');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config();

const { NODE_ENV } = process.env;

/**
 * Demo data configuration
 */
const demoConfig = {
  quick: {
    patients: 5,
    appointments: 10,
    bills: 5,
    medicalRecords: 3
  },
  full: {
    patients: 15,
    appointments: 30,
    bills: 15,
    medicalRecords: 10
  }
};

/**
 * Demo users data
 * Predefined users for demonstration purposes
 */
const demoUsers = [
  // Administrators
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'System Administrator',
    email: 'admin@hms.et',
    password: 'admin123',
    role: 'admin',
    specialization: 'System Administration',
    phone: '+251911111111',
    department: 'Administration'
  },
  // Doctors
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Dr. Alemayehu Teklu',
    email: 'alex@hms.et',
    password: 'doctor123',
    role: 'doctor',
    specialization: 'Cardiology',
    phone: '+251922222222',
    department: 'Cardiology'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Dr. Selamawit Bekele',
    email: 'selam@hms.et',
    password: 'doctor123',
    role: 'doctor',
    specialization: 'Pediatrics',
    phone: '+251922222223',
    department: 'Pediatrics'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Dr. Tesfaye Girma',
    email: 'tesfaye@hms.et',
    password: 'doctor123',
    role: 'doctor',
    specialization: 'General Medicine',
    phone: '+251922222224',
    department: 'OPD'
  },
  // Receptionists
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Receptionist One',
    email: 'reception@hms.et',
    password: 'reception123',
    role: 'receptionist',
    specialization: null,
    phone: '+251933333333',
    department: 'Reception'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Receptionist Two',
    email: 'reception2@hms.et',
    password: 'reception123',
    role: 'receptionist',
    specialization: null,
    phone: '+251933333334',
    department: 'Reception'
  },
  // Lab Technician
  {
    id: '77777777-7777-7777-7777-777777777777',
    name: 'Lab Technician',
    email: 'lab@hms.et',
    password: 'lab123',
    role: 'lab_technician',
    specialization: 'Laboratory',
    phone: '+251944444444',
    department: 'Laboratory'
  }
];

/**
 * Demo patients with realistic medical stories
 */
const demoPatients = [
  // Patient 1: Chronic condition (Hypertension)
  {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    full_name: 'Mekdes Abebe',
    gender: 'female',
    date_of_birth: '1990-05-15',
    phone: '+251911234567',
    email: 'mekdes@email.com',
    address: 'Addis Ababa, Bole, Kebele 12, House No. 45',
    emergency_contact: '+251912345678',
    blood_type: 'O+',
    allergies: 'Penicillin'
  },
  // Patient 2: Pediatric patient
  {
    id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    full_name: 'Abebe Kebede',
    gender: 'male',
    date_of_birth: '2018-08-22',
    phone: '+251912345678',
    email: 'abebe.parent@email.com',
    address: 'Addis Ababa, Kazanchis, Kebele 8, House No. 23',
    emergency_contact: '+251911111111',
    blood_type: 'A+',
    allergies: 'None'
  },
  // Patient 3: Diabetes management
  {
    id: 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa',
    full_name: 'Selamawit Girma',
    gender: 'female',
    date_of_birth: '1975-03-10',
    phone: '+251913456789',
    email: 'selam@email.com',
    address: 'Addis Ababa, Mexico, Kebele 15, House No. 67',
    emergency_contact: '+251912222222',
    blood_type: 'B+',
    allergies: 'Sulfa drugs'
  },
  // Patient 4: Post-surgery follow-up
  {
    id: 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb',
    full_name: 'Yohannes Tesfaye',
    gender: 'male',
    date_of_birth: '1965-11-30',
    phone: '+251914567890',
    email: 'yohannes@email.com',
    address: 'Addis Ababa, Kirkos, Kebele 3, House No. 89',
    emergency_contact: '+251913333333',
    blood_type: 'AB+',
    allergies: 'Latex'
  },
  // Patient 5: Pregnancy care
  {
    id: 'eeeeeeee-ffff-aaaa-bbbb-cccccccccccc',
    full_name: 'Hanna Michael',
    gender: 'female',
    date_of_birth: '1992-01-25',
    phone: '+251915678901',
    email: 'hanna@email.com',
    address: 'Addis Ababa, Nifas Silk, Kebele 7, House No. 12',
    emergency_contact: '+251914444444',
    blood_type: 'O-',
    allergies: 'Iodine contrast'
  }
];

/**
 * Demo appointments with coherent medical stories
 */
const demoAppointments = [
  // Patient 1: Hypertension follow-up
  {
    id: 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
    patient_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    doctor_id: '22222222-2222-2222-2222-222222222222', // Dr. Alemayehu (Cardiology)
    appointment_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    appointment_type: 'follow-up',
    status: 'completed',
    reason: 'Hypertension follow-up and medication adjustment',
    duration_minutes: 30
  },
  {
    id: 'bbbbbbbb-1111-2222-3333-cccccccccccc',
    patient_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    doctor_id: '22222222-2222-2222-2222-222222222222',
    appointment_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    appointment_type: 'follow-up',
    status: 'scheduled',
    reason: 'Next hypertension check-up',
    duration_minutes: 30
  },
  // Patient 2: Child vaccination
  {
    id: 'cccccccc-1111-2222-3333-dddddddddddd',
    patient_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    doctor_id: '33333333-3333-3333-3333-333333333333', // Dr. Selamawit (Pediatrics)
    appointment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    appointment_type: 'consultation',
    status: 'completed',
    reason: '6-month vaccination and growth monitoring',
    duration_minutes: 30
  },
  // Patient 3: Diabetes check
  {
    id: 'dddddddd-1111-2222-3333-eeeeeeeeeeee',
    patient_id: 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa',
    doctor_id: '44444444-4444-4444-4444-444444444444', // Dr. Tesfaye (General Medicine)
    appointment_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    appointment_type: 'consultation',
    status: 'completed',
    reason: 'Blood sugar monitoring and medication review',
    duration_minutes: 45
  },
  // Patient 4: Post-surgery check
  {
    id: 'eeeeeeee-1111-2222-3333-ffffffffffff',
    patient_id: 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb',
    doctor_id: '22222222-2222-2222-2222-222222222222', // Dr. Alemayehu (Cardiology)
    appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    appointment_type: 'follow-up',
    status: 'confirmed',
    reason: 'Post-cardiac surgery check-up',
    duration_minutes: 45
  },
  // Patient 5: Prenatal check
  {
    id: 'ffffffff-1111-2222-3333-aaaaaaaaaaaa',
    patient_id: 'eeeeeeee-ffff-aaaa-bbbb-cccccccccccc',
    doctor_id: '44444444-4444-4444-4444-444444444444', // Dr. Tesfaye (General Medicine)
    appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    appointment_type: 'checkup',
    status: 'scheduled',
    reason: 'Regular prenatal check-up at 24 weeks',
    duration_minutes: 30
  }
];

/**
 * Demo medical records
 */
const demoMedicalRecords = [
  // Patient 1: Hypertension record
  {
    id: 'aaaaaaaa-2222-3333-4444-aaaaaaaaaaaa',
    patient_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    doctor_id: '22222222-2222-2222-2222-222222222222',
    appointment_id: 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
    symptoms: 'Occasional headaches, mild dizziness',
    diagnosis: 'Controlled hypertension',
    prescription: 'Continue Amlodipine 10mg once daily. Lifestyle modifications.',
    notes: 'Blood pressure well-controlled at 130/85. Advised to reduce salt intake.',
    temperature: 36.8,
    blood_pressure: '130/85',
    weight: 68.5,
    height: 170.0,
    follow_up_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  // Patient 2: Child vaccination record
  {
    id: 'bbbbbbbb-2222-3333-4444-bbbbbbbbbbbb',
    patient_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    doctor_id: '33333333-3333-3333-3333-333333333333',
    appointment_id: 'cccccccc-1111-2222-3333-dddddddddddd',
    symptoms: 'None - routine checkup',
    diagnosis: 'Healthy growth and development',
    prescription: 'DTaP, IPV, Hib, PCV13, and Rotavirus vaccines administered',
    notes: 'Child growing well at 50th percentile for weight and height.',
    temperature: 37.0,
    blood_pressure: '90/60',
    weight: 8.2,
    height: 67.0,
    follow_up_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  // Patient 3: Diabetes record
  {
    id: 'cccccccc-2222-3333-4444-cccccccccccc',
    patient_id: 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa',
    doctor_id: '44444444-4444-4444-4444-444444444444',
    appointment_id: 'dddddddd-1111-2222-3333-eeeeeeeeeeee',
    symptoms: 'Increased thirst, frequent urination',
    diagnosis: 'Type 2 Diabetes Mellitus',
    prescription: 'Metformin 850mg twice daily with meals. Blood glucose monitoring.',
    notes: 'Fasting blood sugar: 180 mg/dL. Referred to nutritionist for diet plan.',
    temperature: 36.9,
    blood_pressure: '140/90',
    weight: 78.0,
    height: 165.0,
    follow_up_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
];

/**
 * Demo bills and payments
 */
const demoBills = [
  // Patient 1 bill (paid)
  {
    id: 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa',
    patient_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    appointment_id: 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
    bill_number: 'INV-' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10).replace(/-/g, '') + '-001',
    amount: 1200.00,
    tax_amount: 180.00,
    discount: 0.00,
    payment_status: 'paid',
    payment_method: 'mobile_money',
    provider: 'telebirr',
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paid_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Patient 2 bill (paid)
  {
    id: 'bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb',
    patient_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    appointment_id: 'cccccccc-1111-2222-3333-dddddddddddd',
    bill_number: 'INV-' + new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0,10).replace(/-/g, '') + '-002',
    amount: 850.00,
    tax_amount: 127.50,
    discount: 50.00,
    payment_status: 'paid',
    payment_method: 'cash',
    provider: 'cash',
    due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paid_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Patient 3 bill (pending)
  {
    id: 'cccccccc-3333-4444-5555-cccccccccccc',
    patient_id: 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa',
    appointment_id: 'dddddddd-1111-2222-3333-eeeeeeeeeeee',
    bill_number: 'INV-' + new Date().toISOString().slice(0,10).replace(/-/g, '') + '-003',
    amount: 950.00,
    tax_amount: 142.50,
    discount: 0.00,
    payment_status: 'pending',
    payment_method: null,
    provider: null,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paid_date: null
  }
];

const demoBillItems = [
  // Patient 1 bill items
  {
    id: 'aaaaaaaa-4444-5555-6666-aaaaaaaaaaaa',
    bill_id: 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa',
    service_name: 'Cardiology Consultation',
    quantity: 1,
    unit_price: 800.00
  },
  {
    id: 'bbbbbbbb-4444-5555-6666-bbbbbbbbbbbb',
    bill_id: 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa',
    service_name: 'ECG Test',
    quantity: 1,
    unit_price: 400.00
  },
  // Patient 2 bill items
  {
    id: 'cccccccc-4444-5555-6666-cccccccccccc',
    bill_id: 'bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb',
    service_name: 'Pediatrics Consultation',
    quantity: 1,
    unit_price: 600.00
  },
  {
    id: 'dddddddd-4444-5555-6666-dddddddddddd',
    bill_id: 'bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb',
    service_name: 'Vaccination Service',
    quantity: 1,
    unit_price: 300.00
  },
  // Patient 3 bill items
  {
    id: 'eeeeeeee-4444-5555-6666-eeeeeeeeeeee',
    bill_id: 'cccccccc-3333-4444-5555-cccccccccccc',
    service_name: 'General Consultation',
    quantity: 1,
    unit_price: 500.00
  },
  {
    id: 'ffffffff-4444-5555-6666-ffffffffffff',
    bill_id: 'cccccccc-3333-4444-5555-cccccccccccc',
    service_name: 'Blood Glucose Test',
    quantity: 1,
    unit_price: 200.00
  },
  {
    id: 'aaaaaaa1-4444-5555-6666-aaaaaaaaaaaa',
    bill_id: 'cccccccc-3333-4444-5555-cccccccccccc',
    service_name: 'Urine Analysis',
    quantity: 1,
    unit_price: 250.00
  }
];

const demoPayments = [
  {
    id: 'aaaaaaaa-5555-6666-7777-aaaaaaaaaaaa',
    bill_id: 'aaaaaaaa-3333-4444-5555-aaaaaaaaaaaa',
    transaction_id: 'TXN-' + new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0,10).replace(/-/g, '') + '-001',
    amount: 1380.00,
    currency: 'ETB',
    payment_method: 'mobile_money',
    payment_gateway: 'telebirr',
    status: 'completed',
    metadata: JSON.stringify({
      phone: '+251911234567',
      provider: 'telebirr',
      receipt_number: 'REC001234'
    })
  },
  {
    id: 'bbbbbbbb-5555-6666-7777-bbbbbbbbbbbb',
    bill_id: 'bbbbbbbb-3333-4444-5555-bbbbbbbbbbbb',
    transaction_id: 'TXN-' + new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10).replace(/-/g, '') + '-002',
    amount: 927.50,
    currency: 'ETB',
    payment_method: 'cash',
    payment_gateway: 'cash',
    status: 'completed',
    metadata: JSON.stringify({
      receipt_number: 'CASH001',
      received_by: 'Receptionist One'
    })
  }
];

/**
 * Hash passwords for demo users
 */
async function hashUserPasswords(users) {
  const hashedUsers = [];
  
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    hashedUsers.push({
      ...user,
      password: hashedPassword
    });
  }
  
  return hashedUsers;
}

/**
 * Seed demo users
 */
async function seedUsers() {
  logger.info('Seeding demo users...');
  
  const hashedUsers = await hashUserPasswords(demoUsers);
  let inserted = 0;
  
  for (const user of hashedUsers) {
    try {
      await query(`
        INSERT INTO users (id, name, email, password, role, specialization, phone, department, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          specialization = EXCLUDED.specialization,
          phone = EXCLUDED.phone,
          department = EXCLUDED.department,
          is_active = true
      `, [
        user.id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.specialization,
        user.phone,
        user.department
      ]);
      
      inserted++;
    } catch (error) {
      logger.warn(`Failed to seed user ${user.email}: ${error.message}`);
    }
  }
  
  logger.info(`✅ Seeded ${inserted} demo users`);
  return inserted;
}

/**
 * Seed demo patients
 */
async function seedPatients() {
  logger.info('Seeding demo patients...');
  
  let inserted = 0;
  
  for (const patient of demoPatients) {
    try {
      await query(`
        INSERT INTO patients (id, full_name, gender, date_of_birth, phone, email, address, emergency_contact, blood_type, allergies)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          gender = EXCLUDED.gender,
          date_of_birth = EXCLUDED.date_of_birth,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          emergency_contact = EXCLUDED.emergency_contact,
          blood_type = EXCLUDED.blood_type,
          allergies = EXCLUDED.allergies
      `, [
        patient.id,
        patient.full_name,
        patient.gender,
        patient.date_of_birth,
        patient.phone,
        patient.email,
        patient.address,
        patient.emergency_contact,
        patient.blood_type,
        patient.allergies
      ]);
      
      inserted++;
    } catch (error) {
      logger.warn(`Failed to seed patient ${patient.full_name}: ${error.message}`);
    }
  }
  
  logger.info(`✅ Seeded ${inserted} demo patients`);
  return inserted;
}

/**
 * Seed demo appointments
 */
async function seedAppointments() {
  logger.info('Seeding demo appointments...');
  
  let inserted = 0;
  
  for (const appointment of demoAppointments) {
    try {
      await query(`
        INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, appointment_type, status, reason, duration_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          doctor_id = EXCLUDED.doctor_id,
          appointment_date = EXCLUDED.appointment_date,
          appointment_type = EXCLUDED.appointment_type,
          status = EXCLUDED.status,
          reason = EXCLUDED.reason,
          duration_minutes = EXCLUDED.duration_minutes
      `, [
        appointment.id,
        appointment.patient_id,
        appointment.doctor_id,
        appointment.appointment_date,
        appointment.appointment_type,
        appointment.status,
        appointment.reason,
        appointment.duration_minutes
      ]);
      
      inserted++;
    } catch (error) {
      logger.warn(`Failed to seed appointment: ${error.message}`);
    }
  }
  
  logger.info(`✅ Seeded ${inserted} demo appointments`);
  return inserted;
}

/**
 * Seed demo medical records
 */
async function seedMedicalRecords() {
  logger.info('Seeding demo medical records...');
  
  let inserted = 0;
  
  for (const record of demoMedicalRecords) {
    try {
      await query(`
        INSERT INTO medical_records (id, patient_id, doctor_id, appointment_id, symptoms, diagnosis, prescription, notes, temperature, blood_pressure, weight, height, follow_up_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          doctor_id = EXCLUDED.doctor_id,
          appointment_id = EXCLUDED.appointment_id,
          symptoms = EXCLUDED.symptoms,
          diagnosis = EXCLUDED.diagnosis,
          prescription = EXCLUDED.prescription,
          notes = EXCLUDED.notes,
          temperature = EXCLUDED.temperature,
          blood_pressure = EXCLUDED.blood_pressure,
          weight = EXCLUDED.weight,
          height = EXCLUDED.height,
          follow_up_date = EXCLUDED.follow_up_date
      `, [
        record.id,
        record.patient_id,
        record.doctor_id,
        record.appointment_id,
        record.symptoms,
        record.diagnosis,
        record.prescription,
        record.notes,
        record.temperature,
        record.blood_pressure,
        record.weight,
        record.height,
        record.follow_up_date
      ]);
      
      inserted++;
    } catch (error) {
      logger.warn(`Failed to seed medical record: ${error.message}`);
    }
  }
  
  logger.info(`✅ Seeded ${inserted} demo medical records`);
  return inserted;
}

/**
 * Seed demo bills and payments
 */
async function seedBillsAndPayments() {
  logger.info('Seeding demo bills and payments...');
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Seed bills
    let billsInserted = 0;
    for (const bill of demoBills) {
      try {
        await client.query(`
          INSERT INTO bills (id, patient_id, appointment_id, bill_number, amount, tax_amount, discount, payment_status, payment_method, provider, due_date, paid_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            patient_id = EXCLUDED.patient_id,
            appointment_id = EXCLUDED.appointment_id,
            bill_number = EXCLUDED.bill_number,
            amount = EXCLUDED.amount,
            tax_amount = EXCLUDED.tax_amount,
            discount = EXCLUDED.discount,
            payment_status = EXCLUDED.payment_status,
            payment_method = EXCLUDED.payment_method,
            provider = EXCLUDED.provider,
            due_date = EXCLUDED.due_date,
            paid_date = EXCLUDED.paid_date
        `, [
          bill.id,
          bill.patient_id,
          bill.appointment_id,
          bill.bill_number,
          bill.amount,
          bill.tax_amount,
          bill.discount,
          bill.payment_status,
          bill.payment_method,
          bill.provider,
          bill.due_date,
          bill.paid_date
        ]);
        
        billsInserted++;
      } catch (error) {
        logger.warn(`Failed to seed bill ${bill.bill_number}: ${error.message}`);
      }
    }
    
    // Seed bill items
    let billItemsInserted = 0;
    for (const item of demoBillItems) {
      try {
        await client.query(`
          INSERT INTO bill_items (id, bill_id, service_name, quantity, unit_price)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            bill_id = EXCLUDED.bill_id,
            service_name = EXCLUDED.service_name,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price
        `, [
          item.id,
          item.bill_id,
          item.service_name,
          item.quantity,
          item.unit_price
        ]);
        
        billItemsInserted++;
      } catch (error) {
        logger.warn(`Failed to seed bill item: ${error.message}`);
      }
    }
    
    // Seed payments
    let paymentsInserted = 0;
    for (const payment of demoPayments) {
      try {
        await client.query(`
          INSERT INTO payments (id, bill_id, transaction_id, amount, currency, payment_method, payment_gateway, status, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            bill_id = EXCLUDED.bill_id,
            transaction_id = EXCLUDED.transaction_id,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            payment_method = EXCLUDED.payment_method,
            payment_gateway = EXCLUDED.payment_gateway,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata
        `, [
          payment.id,
          payment.bill_id,
          payment.transaction_id,
          payment.amount,
          payment.currency,
          payment.payment_method,
          payment.payment_gateway,
          payment.status,
          payment.metadata
        ]);
        
        paymentsInserted++;
      } catch (error) {
        logger.warn(`Failed to seed payment: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    client.release();
    
    logger.info(`✅ Seeded ${billsInserted} bills, ${billItemsInserted} bill items, and ${paymentsInserted} payments`);
    return { bills: billsInserted, billItems: billItemsInserted, payments: paymentsInserted };
    
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    throw error;
  }
}

/**
 * Ensure services exist
 */
async function ensureServices() {
  logger.info('Ensuring demo services exist...');
  
  const demoServices = [
    { code: 'CONSULT', name: 'General Consultation', price: 500.00, category: 'Consultation' },
    { code: 'CARD-CONSULT', name: 'Cardiology Consultation', price: 800.00, category: 'Cardiology' },
    { code: 'PED-CONSULT', name: 'Pediatrics Consultation', price: 600.00, category: 'Pediatrics' },
    { code: 'ECG', name: 'ECG Test', price: 400.00, category: 'Cardiology' },
    { code: 'VACCINE', name: 'Vaccination Service', price: 300.00, category: 'Pediatrics' },
    { code: 'GLUCOSE', name: 'Blood Glucose Test', price: 200.00, category: 'Laboratory' },
    { code: 'URINALYSIS', name: 'Urine Analysis', price: 250.00, category: 'Laboratory' }
  ];
  
  let inserted = 0;
  
  for (const service of demoServices) {
    try {
      await query(`
        INSERT INTO services (service_code, service_name, price, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (service_code) DO UPDATE SET
          service_name = EXCLUDED.service_name,
          price = EXCLUDED.price,
          category = EXCLUDED.category
      `, [service.code, service.name, service.price, service.category]);
      
      inserted++;
    } catch (error) {
      logger.warn(`Failed to ensure service ${service.code}: ${error.message}`);
    }
  }
  
  logger.info(`✅ Ensured ${inserted} demo services`);
  return inserted;
}

/**
 * Show demo credentials
 */
function showDemoCredentials() {
  console.log('\n🔐 DEMO CREDENTIALS');
  console.log('='.repeat(50));
  
  console.log('\nAdministrators:');
  console.log('  Email: admin@hms.et');
  console.log('  Password: admin123');
  
  console.log('\nDoctors:');
  console.log('  Email: alex@hms.et');
  console.log('  Password: doctor123');
  console.log('  Email: selam@hms.et');
  console.log('  Password: doctor123');
  console.log('  Email: tesfaye@hms.et');
  console.log('  Password: doctor123');
  
  console.log('\nReceptionists:');
  console.log('  Email: reception@hms.et');
  console.log('  Password: reception123');
  console.log('  Email: reception2@hms.et');
  console.log('  Password: reception123');
  
  console.log('\nLab Technician:');
  console.log('  Email: lab@hms.et');
  console.log('  Password: lab123');
  
  console.log('\nPatient Demo Accounts:');
  console.log('  Patient 1: Mekdes Abebe (Hypertension case)');
  console.log('  Patient 2: Abebe Kebede (Pediatric vaccination)');
  console.log('  Patient 3: Selamawit Girma (Diabetes management)');
  console.log('  Patient 4: Yohannes Tesfaye (Post-surgery follow-up)');
  console.log('  Patient 5: Hanna Michael (Prenatal care)');
  
  console.log('\n💡 TIP: Use the patient phone numbers to search for them in the system');
  console.log('='.repeat(50));
}

/**
 * Show demo statistics
 */
async function showDemoStatistics() {
  logger.info('\n📊 DEMO DATABASE STATISTICS');
  logger.info('='.repeat(50));
  
  const tables = [
    { name: 'users', description: 'Staff Members' },
    { name: 'patients', description: 'Patients' },
    { name: 'appointments', description: 'Appointments' },
    { name: 'medical_records', description: 'Medical Records' },
    { name: 'bills', description: 'Bills/Invoices' },
    { name: 'payments', description: 'Payment Transactions' },
    { name: 'bill_items', description: 'Bill Line Items' },
    { name: 'services', description: 'Medical Services' }
  ];
  
  for (const table of tables) {
    try {
      const result = await query(`SELECT COUNT(*) FROM ${table.name}`);
      const count = parseInt(result.rows[0].count);
      logger.info(`${table.description.padEnd(25)}: ${count}`);
    } catch (error) {
      logger.warn(`${table.description.padEnd(25)}: Error - ${error.message}`);
    }
  }
  
  logger.info('='.repeat(50));
}

/**
 * Main seed function
 */
async function seedDemoData(options = {}) {
  const { reset = false, quick = false, full = false } = options;
  
  logger.info('Starting demo data seeding...');
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Reset first: ${reset}`);
  logger.info(`Quick mode: ${quick}`);
  logger.info(`Full mode: ${full}`);
  
  if (NODE_ENV === 'production') {
    logger.error('❌ Demo data seeding is NOT allowed in production!');
    return { success: false, error: 'Production not allowed' };
  }
  
  // Reset database if requested
  if (reset) {
    logger.warn('Resetting database before seeding...');
    const { resetDatabase } = require('./resetDatabase');
    await resetDatabase(true); // Force reset
  }
  
  try {
    // Ensure basic services exist
    await ensureServices();
    
    // Seed data in dependency order
    const results = {
      users: await seedUsers(),
      patients: await seedPatients(),
      appointments: await seedAppointments(),
      medicalRecords: await seedMedicalRecords(),
      billing: await seedBillsAndPayments()
    };
    
    // Show statistics
    await showDemoStatistics();
    
    // Show credentials
    showDemoCredentials();
    
    logger.info('\n==========================================');
    logger.info('✅ DEMO DATA SEEDING COMPLETED');
    logger.info('==========================================');
    logger.info(`Users: ${results.users}`);
    logger.info(`Patients: ${results.patients}`);
    logger.info(`Appointments: ${results.appointments}`);
    logger.info(`Medical Records: ${results.medicalRecords}`);
    logger.info(`Bills: ${results.billing.bills}`);
    logger.info(`Bill Items: ${results.billing.billItems}`);
    logger.info(`Payments: ${results.billing.payments}`);
    logger.info('==========================================');
    logger.info('\n🚀 Demo is ready! Use the credentials above to login.');
    logger.info('💡 The demo includes complete patient journeys with:');
    logger.info('   - Medical histories');
    logger.info('   - Appointments (past and future)');
    logger.info('   - Bills and payments');
    logger.info('   - Different user roles');
    logger.info('==========================================\n');
    
    return { success: true, results };
    
  } catch (error) {
    logger.error('❌ Demo data seeding failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    reset: false,
    quick: false,
    full: false
  };
  
  args.forEach(arg => {
    if (arg === '--reset' || arg === '-r') {
      options.reset = true;
    } else if (arg === '--quick' || arg === '-q') {
      options.quick = true;
    } else if (arg === '--full' || arg === '-f') {
      options.full = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Demo Data Seeding Script
Usage: node scripts/seedDemo.js [options]

Options:
  --reset, -r    Reset database before seeding
  --quick, -q    Quick seed (minimal data)
  --full, -f     Full seed (comprehensive data)
  --help, -h     Show this help message

Examples:
  node scripts/seedDemo.js           # Standard demo seed
  node scripts/seedDemo.js --reset   # Reset then seed
  node scripts/seedDemo.js --quick   # Quick minimal seed
      `);
      process.exit(0);
    }
  });
  
  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  seedDemoData(options).catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export for programmatic use
module.exports = {
  seedDemoData,
  showDemoCredentials,
  showDemoStatistics
};