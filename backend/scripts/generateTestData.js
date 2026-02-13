/**
 * Test Data Generator Script
 * 
 * This script generates realistic test data for the HMS database.
 * It's useful for development, testing, and demonstrations.
 * 
 * Features:
 * 1. Generates realistic Ethiopian names and data
 * 2. Creates coherent relationships between entities
 * 3. Supports customizable data volume
 * 4. Maintains data consistency
 * 
 * Usage: node scripts/generateTestData.js [options]
 * Options:
 *   --patients=100     Number of patients to generate
 *   --appointments=50  Number of appointments to generate
 *   --doctors=10       Number of doctors to generate
 *   --clear-first      Clear existing data first
 *   --dry-run          Show what would be generated
 */

const { query, getClient } = require('../database/connection');
const logger = require('../utils/logger');
const { faker } = require('@faker-js/faker');

// Configure faker for Ethiopian context
faker.locale = 'en';

// Load environment variables
require('dotenv').config();

const { NODE_ENV } = process.env;

/**
 * Ethiopian-specific data generators
 */
const ethiopianData = {
  // Common Ethiopian first names (male and female)
  firstNames: {
    male: [
      'Alemayehu', 'Tesfaye', 'Mulugeta', 'Yohannes', 'Getachew', 
      'Abebe', 'Kebede', 'Girma', 'Tadesse', 'Mekonnen',
      'Dawit', 'Solomon', 'Samuel', 'Daniel', 'Michael',
      'Haile', 'Bereket', 'Ephrem', 'Henok', 'Natnael'
    ],
    female: [
      'Mekdes', 'Selamawit', 'Kalkidan', 'Hanna', 'Ruth',
      'Bethlehem', 'Marta', 'Tigist', 'Yetnayet', 'Rahel',
      'Sara', 'Rebeca', 'Eyerusalem', 'Mahlet', 'Frehiwot',
      'Aster', 'Azeb', 'Birtukan', 'Chaltu', 'Desta'
    ]
  },
  
  // Common Ethiopian last names
  lastNames: [
    'Tesfaye', 'Girma', 'Kebede', 'Abebe', 'Alemu',
    'Assefa', 'Bekele', 'Desta', 'Getachew', 'Haile',
    'Mekonnen', 'Mohammed', 'Solomon', 'Tadesse', 'Wolde',
    'Yohannes', 'Zewdie', 'Alemayehu', 'Berhanu', 'Demissie'
  ],
  
  // Ethiopian cities and sub-cities
  cities: [
    { city: 'Addis Ababa', subCities: ['Bole', 'Kirkos', 'Lideta', 'Arada', 'Yeka', 'Gullele', 'Nifas Silk', 'Kolfe'] },
    { city: 'Adama', subCities: ['Central', 'Boku', 'Dire'] },
    { city: 'Bahir Dar', subCities: ['Central', 'Shum Abo'] },
    { city: 'Mekelle', subCities: ['Central', 'Kedamay Weyane'] },
    { city: 'Hawassa', subCities: ['Central', 'Tabor'] }
  ],
  
  // Ethiopian phone number prefixes (mobile)
  phonePrefixes: ['911', '912', '913', '914', '915', '916', '917', '918', '919', '921', '922', '923', '924', '925', '926', '927', '928', '929'],
  
  // Blood types with distribution
  bloodTypes: [
    { type: 'O+', probability: 0.35 },
    { type: 'A+', probability: 0.28 },
    { type: 'B+', probability: 0.22 },
    { type: 'AB+', probability: 0.05 },
    { type: 'O-', probability: 0.04 },
    { type: 'A-', probability: 0.03 },
    { type: 'B-', probability: 0.02 },
    { type: 'AB-', probability: 0.01 }
  ],
  
  // Common allergies in Ethiopia
  allergies: [
    'Penicillin', 'Sulfa drugs', 'Aspirin', 'Ibuprofen', 'Codeine',
    'Latex', 'Peanuts', 'Tree nuts', 'Shellfish', 'Eggs',
    'Milk', 'Soy', 'Wheat', 'Fish', 'Sesame',
    'Bee stings', 'Dust mites', 'Pollen', 'Mold', 'Pet dander',
    'None'
  ],
  
  // Medical specializations
  specializations: [
    'Cardiology', 'Pediatrics', 'General Medicine', 'Internal Medicine',
    'Surgery', 'Orthopedics', 'Gynecology', 'Dermatology',
    'Neurology', 'Psychiatry', 'Radiology', 'Anesthesiology',
    'Emergency Medicine', 'Family Medicine', 'Ophthalmology'
  ],
  
  // Common symptoms
  symptoms: [
    'Fever', 'Headache', 'Cough', 'Fatigue', 'Body aches',
    'Sore throat', 'Runny nose', 'Shortness of breath', 'Chest pain',
    'Abdominal pain', 'Nausea', 'Vomiting', 'Diarrhea', 'Dizziness',
    'Joint pain', 'Back pain', 'Rash', 'Loss of appetite', 'Weakness'
  ],
  
  // Common diagnoses
  diagnoses: [
    'Viral upper respiratory infection', 'Hypertension', 'Diabetes mellitus',
    'Acute gastroenteritis', 'Urinary tract infection', 'Migraine',
    'Musculoskeletal pain', 'Anxiety disorder', 'Depressive episode',
    'Asthma exacerbation', 'Allergic rhinitis', 'Conjunctivitis',
    'Dermatitis', 'Anemia', 'Hyperlipidemia', 'Osteoarthritis'
  ],
  
  // Common prescriptions
  prescriptions: [
    'Paracetamol 500mg every 6 hours as needed for pain/fever',
    'Ibuprofen 400mg every 8 hours with food',
    'Amoxicillin 500mg every 8 hours for 7 days',
    'Lisinopril 10mg once daily for hypertension',
    'Metformin 500mg twice daily with meals',
    'Salbutamol inhaler 2 puffs every 4-6 hours as needed',
    'Cetirizine 10mg once daily for allergies',
    'Omeprazole 20mg once daily before breakfast',
    'Atorvastatin 20mg once daily at bedtime',
    'Sertraline 50mg once daily for depression'
  ]
};

/**
 * Utility functions for data generation
 */
const utils = {
  // Get random item from array
  randomItem: (array) => array[Math.floor(Math.random() * array.length)],
  
  // Get random items from array (multiple)
  randomItems: (array, min = 1, max = 3) => {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },
  
  // Generate Ethiopian phone number
  generatePhone: () => {
    const prefix = utils.randomItem(ethiopianData.phonePrefixes);
    const suffix = Math.floor(100000 + Math.random() * 900000); // 6-digit suffix
    return `+251${prefix}${suffix}`;
  },
  
  // Generate Ethiopian address
  generateAddress: () => {
    const cityData = utils.randomItem(ethiopianData.cities);
    const subCity = utils.randomItem(cityData.subCities);
    const kebele = Math.floor(Math.random() * 20) + 1;
    const houseNumber = Math.floor(Math.random() * 500) + 1;
    
    return `${cityData.city}, ${subCity}, Kebele ${kebele}, House No. ${houseNumber}`;
  },
  
  // Generate date of birth (between 1 and 90 years old)
  generateDateOfBirth: () => {
    const maxAge = 90 * 365; // days
    const minAge = 1 * 365;  // days
    const ageInDays = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
    const birthDate = new Date();
    birthDate.setDate(birthDate.getDate() - ageInDays);
    return birthDate.toISOString().split('T')[0];
  },
  
  // Generate appointment date (within next 30 days)
  generateAppointmentDate: () => {
    const now = new Date();
    const futureDays = Math.floor(Math.random() * 30) + 1; // 1-30 days in future
    const date = new Date(now);
    date.setDate(date.getDate() + futureDays);
    
    // Set random time between 8 AM and 4 PM, rounded to 30 minutes
    const hour = Math.floor(Math.random() * 9) + 8; // 8-16
    const minute = Math.random() > 0.5 ? 30 : 0;
    
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  },
  
  // Generate blood type based on probability distribution
  generateBloodType: () => {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const bt of ethiopianData.bloodTypes) {
      cumulative += bt.probability;
      if (rand <= cumulative) {
        return bt.type;
      }
    }
    
    return 'O+'; // default
  },
  
  // Generate allergies (25% chance of having allergies)
  generateAllergies: () => {
    if (Math.random() > 0.25) {
      return 'None';
    }
    
    const allergyCount = Math.floor(Math.random() * 3) + 1; // 1-3 allergies
    const selectedAllergies = utils.randomItems(
      ethiopianData.allergies.filter(a => a !== 'None'),
      allergyCount,
      allergyCount
    );
    
    return selectedAllergies.join(', ');
  },
  
  // Generate Ethiopian name
  generateName: (gender) => {
    const firstName = utils.randomItem(ethiopianData.firstNames[gender]);
    const lastName = utils.randomItem(ethiopianData.lastNames);
    return `${firstName} ${lastName}`;
  },
  
  // Generate email from name
  generateEmail: (fullName) => {
    const [firstName, lastName] = fullName.toLowerCase().split(' ');
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'email.com'];
    const domain = utils.randomItem(domains);
    return `${firstName}.${lastName}@${domain}`;
  }
};

/**
 * Data generation functions
 */

/**
 * Generate doctors
 */
async function generateDoctors(count = 10) {
  logger.info(`Generating ${count} doctors...`);
  
  const doctors = [];
  
  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const fullName = utils.generateName(gender);
    const specialization = utils.randomItem(ethiopianData.specializations);
    
    // Generate department based on specialization
    let department = specialization;
    if (specialization === 'General Medicine' || specialization === 'Family Medicine') {
      department = 'OPD';
    } else if (specialization === 'Emergency Medicine') {
      department = 'Emergency';
    }
    
    const doctor = {
      name: `Dr. ${fullName}`,
      email: `dr.${fullName.toLowerCase().replace(' ', '.')}@hms.et`,
      password: '$2b$10$YourHashedPasswordHere', // Hashed "password123"
      role: 'doctor',
      specialization,
      phone: utils.generatePhone(),
      department,
      is_active: Math.random() > 0.1 // 90% active
    };
    
    doctors.push(doctor);
  }
  
  // Insert doctors
  let inserted = 0;
  for (const doctor of doctors) {
    try {
      await query(`
        INSERT INTO users (name, email, password, role, specialization, phone, department, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO NOTHING
      `, [
        doctor.name,
        doctor.email,
        doctor.password,
        doctor.role,
        doctor.specialization,
        doctor.phone,
        doctor.department,
        doctor.is_active
      ]);
      
      if ((await query('SELECT COUNT(*) FROM users WHERE email = $1', [doctor.email])).rows[0].count > 0) {
        inserted++;
      }
    } catch (error) {
      logger.warn(`Failed to insert doctor ${doctor.name}: ${error.message}`);
    }
  }
  
  logger.info(`✅ Generated ${inserted} doctors`);
  return inserted;
}

/**
 * Generate patients
 */
async function generatePatients(count = 100) {
  logger.info(`Generating ${count} patients...`);
  
  const patients = [];
  
  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const fullName = utils.generateName(gender);
    
    const patient = {
      full_name: fullName,
      gender,
      date_of_birth: utils.generateDateOfBirth(),
      phone: utils.generatePhone(),
      email: utils.generateEmail(fullName),
      address: utils.generateAddress(),
      emergency_contact: utils.generatePhone(),
      blood_type: utils.generateBloodType(),
      allergies: utils.generateAllergies()
    };
    
    patients.push(patient);
  }
  
  // Insert patients in batches for better performance
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < patients.length; i += batchSize) {
    const batch = patients.slice(i, i + batchSize);
    
    // Build parameterized query for batch insert
    const values = [];
    const params = [];
    let paramIndex = 1;
    
    batch.forEach((patient, index) => {
      values.push(`(
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}
      )`);
      
      params.push(
        patient.full_name,
        patient.gender,
        patient.date_of_birth,
        patient.phone,
        patient.email,
        patient.address,
        patient.emergency_contact,
        patient.blood_type,
        patient.allergies
      );
    });
    
    const queryText = `
      INSERT INTO patients (
        full_name, gender, date_of_birth, phone, email, 
        address, emergency_contact, blood_type, allergies
      ) VALUES ${values.join(', ')}
      ON CONFLICT (phone) DO NOTHING
    `;
    
    try {
      const result = await query(queryText, params);
      inserted += batch.length;
    } catch (error) {
      logger.warn(`Failed to insert batch of patients: ${error.message}`);
    }
  }
  
  logger.info(`✅ Generated ${inserted} patients`);
  return inserted;
}

/**
 * Generate appointments
 */
async function generateAppointments(count = 50) {
  logger.info(`Generating ${count} appointments...`);
  
  // Get available doctors and patients
  const doctors = await query(`
    SELECT id, name FROM users 
    WHERE role = 'doctor' AND is_active = true
    ORDER BY RANDOM()
    LIMIT 20
  `);
  
  const patients = await query(`
    SELECT id, full_name FROM patients 
    ORDER BY RANDOM() 
    LIMIT 100
  `);
  
  if (doctors.rows.length === 0 || patients.rows.length === 0) {
    logger.warn('Need doctors and patients before generating appointments');
    return 0;
  }
  
  const appointmentTypes = ['consultation', 'follow-up', 'emergency', 'checkup'];
  const appointmentStatuses = ['scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled'];
  
  let inserted = 0;
  
  for (let i = 0; i < count; i++) {
    const doctor = utils.randomItem(doctors.rows);
    const patient = utils.randomItem(patients.rows);
    
    const appointment = {
      patient_id: patient.id,
      doctor_id: doctor.id,
      appointment_date: utils.generateAppointmentDate(),
      appointment_type: utils.randomItem(appointmentTypes),
      status: utils.randomItem(appointmentStatuses),
      reason: utils.randomItem(ethiopianData.symptoms) + ' for ' + (Math.floor(Math.random() * 5) + 1) + ' days',
      duration_minutes: [15, 30, 45, 60][Math.floor(Math.random() * 4)]
    };
    
    try {
      await query(`
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, appointment_type, 
          status, reason, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
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
      logger.warn(`Failed to insert appointment: ${error.message}`);
    }
  }
  
  logger.info(`✅ Generated ${inserted} appointments`);
  return inserted;
}

/**
 * Generate medical records
 */
async function generateMedicalRecords(count = 30) {
  logger.info(`Generating ${count} medical records...`);
  
  // Get completed appointments
  const appointments = await query(`
    SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date
    FROM appointments a
    WHERE a.status = 'completed'
    ORDER BY RANDOM()
    LIMIT ${count * 2}  // Get extra for selection
  `);
  
  if (appointments.rows.length === 0) {
    logger.warn('Need completed appointments before generating medical records');
    return 0;
  }
  
  let inserted = 0;
  
  for (let i = 0; i < Math.min(count, appointments.rows.length); i++) {
    const appointment = appointments.rows[i];
    
    const symptoms = utils.randomItems(ethiopianData.symptoms, 1, 4).join(', ');
    const diagnosis = utils.randomItem(ethiopianData.diagnoses);
    const prescription = utils.randomItem(ethiopianData.prescriptions);
    
    const medicalRecord = {
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_id: appointment.id,
      symptoms,
      diagnosis,
      prescription,
      notes: `Patient presented with ${symptoms.toLowerCase()}. ${diagnosis}. Follow-up as needed.`,
      temperature: (36.5 + Math.random() * 2).toFixed(1), // 36.5-38.5
      blood_pressure: `${Math.floor(100 + Math.random() * 30)}/${Math.floor(60 + Math.random() * 20)}`,
      weight: (50 + Math.random() * 40).toFixed(1), // 50-90 kg
      height: (150 + Math.random() * 40).toFixed(1), // 150-190 cm
      follow_up_date: new Date(
        new Date(appointment.appointment_date).getTime() + 
        (14 + Math.random() * 30) * 24 * 60 * 60 * 1000 // 14-44 days later
      ).toISOString().split('T')[0]
    };
    
    try {
      await query(`
        INSERT INTO medical_records (
          patient_id, doctor_id, appointment_id, symptoms, diagnosis, prescription,
          notes, temperature, blood_pressure, weight, height, follow_up_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        medicalRecord.patient_id,
        medicalRecord.doctor_id,
        medicalRecord.appointment_id,
        medicalRecord.symptoms,
        medicalRecord.diagnosis,
        medicalRecord.prescription,
        medicalRecord.notes,
        medicalRecord.temperature,
        medicalRecord.blood_pressure,
        medicalRecord.weight,
        medicalRecord.height,
        medicalRecord.follow_up_date
      ]);
      
      inserted++;
    } catch (error) {
      logger.warn(`Failed to insert medical record: ${error.message}`);
    }
  }
  
  logger.info(`✅ Generated ${inserted} medical records`);
  return inserted;
}

/**
 * Generate bills and payments
 */
async function generateBillsAndPayments() {
  logger.info('Generating bills and payments...');
  
  // Get appointments that don't have bills yet
  const appointments = await query(`
    SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date
    FROM appointments a
    LEFT JOIN bills b ON a.id = b.appointment_id
    WHERE b.id IS NULL
    AND a.status IN ('completed', 'checked-in', 'in-progress')
    LIMIT 50
  `);
  
  if (appointments.rows.length === 0) {
    logger.warn('No appointments available for billing');
    return { bills: 0, payments: 0 };
  }
  
  // Get services for bill items
  const services = await query(`
    SELECT id, service_code, service_name, price 
    FROM services 
    WHERE is_active = true
  `);
  
  const paymentMethods = ['cash', 'mobile_money', 'bank_transfer', 'insurance'];
  const paymentStatuses = ['pending', 'paid', 'partially_paid'];
  
  let billsInserted = 0;
  let paymentsInserted = 0;
  
  for (const appointment of appointments.rows) {
    try {
      // Start transaction for each bill
      const client = await getClient();
      
      try {
        await client.query('BEGIN');
        
        // Generate bill number
        const billNumberResult = await client.query(`
          SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                 LPAD(COALESCE(MAX(SUBSTRING(bill_number FROM '-(\\d+)$')::INTEGER), 0) + 1, 3, '0') 
          FROM bills 
          WHERE bill_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'
        `);
        
        const billNumber = billNumberResult.rows[0]?.lpad || `INV-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-001`;
        
        // Calculate bill amount (1-3 services)
        const serviceCount = Math.floor(Math.random() * 3) + 1;
        const selectedServices = utils.randomItems(services.rows, serviceCount, serviceCount);
        
        let amount = 0;
        const billItems = [];
        
        for (const service of selectedServices) {
          const quantity = Math.floor(Math.random() * 2) + 1; // 1-2
          const subtotal = service.price * quantity;
          amount += subtotal;
          
          billItems.push({
            service_id: service.id,
            service_name: service.service_name,
            quantity,
            unit_price: service.price
          });
        }
        
        // Add tax (15% VAT in Ethiopia)
        const taxAmount = amount * 0.15;
        const discount = Math.random() > 0.8 ? amount * 0.1 : 0; // 20% chance of 10% discount
        
        // Determine payment status
        const paymentStatus = utils.randomItem(paymentStatuses);
        const paymentMethod = paymentStatus === 'pending' ? null : utils.randomItem(paymentMethods);
        
        // Insert bill
        const billResult = await client.query(`
          INSERT INTO bills (
            patient_id, appointment_id, bill_number, amount, tax_amount, discount,
            payment_status, payment_method, due_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          appointment.patient_id,
          appointment.id,
          billNumber,
          amount,
          taxAmount,
          discount,
          paymentStatus,
          paymentMethod,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
        ]);
        
        const billId = billResult.rows[0].id;
        billsInserted++;
        
        // Insert bill items
        for (const item of billItems) {
          await client.query(`
            INSERT INTO bill_items (bill_id, service_id, service_name, quantity, unit_price)
            VALUES ($1, $2, $3, $4, $5)
          `, [billId, item.service_id, item.service_name, item.quantity, item.unit_price]);
        }
        
        // Insert payment if bill is paid or partially paid
        if (paymentStatus !== 'pending') {
          const paymentAmount = paymentStatus === 'paid' 
            ? amount + taxAmount - discount 
            : (amount + taxAmount - discount) * 0.5; // 50% for partially paid
          
          const paymentProviders = {
            'mobile_money': ['telebirr', 'cbebirr', 'hellocash'],
            'bank_transfer': ['CBE', 'Awash', 'Dashen'],
            'cash': ['cash'],
            'insurance': ['NHIF', 'Private Insurance']
          };
          
          const provider = paymentMethod ? utils.randomItem(paymentProviders[paymentMethod] || ['N/A']) : 'N/A';
          
          await client.query(`
            INSERT INTO payments (
              bill_id, transaction_id, amount, currency, payment_method, 
              payment_gateway, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            billId,
            `TXN-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${billsInserted}`,
            paymentAmount,
            'ETB',
            paymentMethod,
            provider,
            paymentStatus === 'paid' ? 'completed' : 'processing',
            JSON.stringify({
              generated_by: 'test_data_script',
              timestamp: new Date().toISOString()
            })
          ]);
          
          paymentsInserted++;
          
          // Update bill paid_date if fully paid
          if (paymentStatus === 'paid') {
            await client.query(`
              UPDATE bills SET paid_date = NOW() WHERE id = $1
            `, [billId]);
          }
        }
        
        await client.query('COMMIT');
        client.release();
        
      } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        throw error;
      }
      
    } catch (error) {
      logger.warn(`Failed to generate bill for appointment ${appointment.id}: ${error.message}`);
    }
  }
  
  logger.info(`✅ Generated ${billsInserted} bills and ${paymentsInserted} payments`);
  return { bills: billsInserted, payments: paymentsInserted };
}

/**
 * Clear existing test data (optional)
 */
async function clearTestData() {
  logger.warn('Clearing existing test data...');
  
  try {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Delete in correct order due to foreign key constraints
      await client.query('DELETE FROM payments');
      await client.query('DELETE FROM bill_items');
      await client.query('DELETE FROM bills');
      await client.query('DELETE FROM medical_records');
      await client.query('DELETE FROM appointments');
      
      // Don't delete all patients - keep some for reference
      await client.query(`
        DELETE FROM patients 
        WHERE id NOT IN (
          SELECT patient_id FROM medical_records 
          UNION 
          SELECT patient_id FROM appointments
          UNION
          SELECT id FROM patients WHERE phone LIKE '+251911%'
        )
      `);
      
      // Don't delete doctors - keep system users
      await client.query(`
        DELETE FROM users 
        WHERE role IN ('doctor', 'receptionist', 'lab_technician')
        AND email NOT LIKE '%@hms.et'
      `);
      
      await client.query('COMMIT');
      client.release();
      
      logger.info('✅ Test data cleared');
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
    
  } catch (error) {
    logger.error('Error clearing test data:', error.message);
    return false;
  }
}

/**
 * Show database statistics
 */
async function showStatistics() {
  logger.info('\n📊 DATABASE STATISTICS');
  logger.info('='.repeat(50));
  
  const tables = ['users', 'patients', 'appointments', 'medical_records', 'bills', 'payments', 'bill_items', 'services'];
  
  for (const table of tables) {
    try {
      const result = await query(`SELECT COUNT(*) FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      logger.info(`${table.padEnd(20)}: ${count.toLocaleString()}`);
    } catch (error) {
      logger.warn(`${table.padEnd(20)}: Error - ${error.message}`);
    }
  }
  
  logger.info('='.repeat(50));
}

/**
 * Main function
 */
async function generateTestData(options = {}) {
  const {
    patients = 100,
    appointments = 50,
    doctors = 10,
    clearFirst = false,
    dryRun = false
  } = options;
  
  logger.info('Starting test data generation...');
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Patients: ${patients}`);
  logger.info(`Appointments: ${appointments}`);
  logger.info(`Doctors: ${doctors}`);
  logger.info(`Clear first: ${clearFirst}`);
  logger.info(`Dry run: ${dryRun}`);
  
  if (NODE_ENV === 'production') {
    logger.error('❌ Test data generation is NOT allowed in production!');
    return { success: false, error: 'Production not allowed' };
  }
  
  if (dryRun) {
    logger.info('\n📋 DRY RUN - No data will be generated');
    await showStatistics();
    return { success: true, dryRun: true };
  }
  
  // Clear existing test data if requested
  if (clearFirst) {
    await clearTestData();
  }
  
  // Show initial statistics
  await showStatistics();
  
  const results = {
    doctors: 0,
    patients: 0,
    appointments: 0,
    medicalRecords: 0,
    bills: 0,
    payments: 0
  };
  
  try {
    // Generate data in order of dependencies
    results.doctors = await generateDoctors(doctors);
    results.patients = await generatePatients(patients);
    results.appointments = await generateAppointments(appointments);
    results.medicalRecords = await generateMedicalRecords(Math.floor(appointments * 0.6)); // 60% of appointments
    
    const billingResults = await generateBillsAndPayments();
    results.bills = billingResults.bills;
    results.payments = billingResults.payments;
    
    // Show final statistics
    await showStatistics();
    
    logger.info('\n==========================================');
    logger.info('✅ TEST DATA GENERATION COMPLETED');
    logger.info('==========================================');
    logger.info(`Doctors: ${results.doctors}`);
    logger.info(`Patients: ${results.patients}`);
    logger.info(`Appointments: ${results.appointments}`);
    logger.info(`Medical Records: ${results.medicalRecords}`);
    logger.info(`Bills: ${results.bills}`);
    logger.info(`Payments: ${results.payments}`);
    logger.info('==========================================\n');
    
    return { success: true, results };
    
  } catch (error) {
    logger.error('❌ Test data generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    patients: 100,
    appointments: 50,
    doctors: 10,
    clearFirst: false,
    dryRun: false
  };
  
  args.forEach(arg => {
    if (arg.startsWith('--patients=')) {
      options.patients = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--appointments=')) {
      options.appointments = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--doctors=')) {
      options.doctors = parseInt(arg.split('=')[1]);
    } else if (arg === '--clear-first' || arg === '-c') {
      options.clearFirst = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Test Data Generator Script
Usage: node scripts/generateTestData.js [options]

Options:
  --patients=N         Number of patients to generate (default: 100)
  --appointments=N     Number of appointments to generate (default: 50)
  --doctors=N          Number of doctors to generate (default: 10)
  --clear-first, -c    Clear existing test data first
  --dry-run, -d        Show what would be generated
  --help, -h           Show this help message

Examples:
  node scripts/generateTestData.js
  node scripts/generateTestData.js --patients=200 --appointments=100
  node scripts/generateTestData.js --clear-first --doctors=5
  node scripts/generateTestData.js --dry-run
      `);
      process.exit(0);
    }
  });
  
  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  generateTestData(options).catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export for programmatic use
module.exports = {
  generateTestData,
  clearTestData,
  showStatistics
};