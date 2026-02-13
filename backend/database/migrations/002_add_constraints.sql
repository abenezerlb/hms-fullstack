/*
Billing and Payment Schema Migration
Version: 1.0.0
Description: Creates billing, payment, and service-related tables
This migration adds financial management capabilities to the HMS.
*/

-- 5. Bills/Invoices Table
-- Stores patient invoices with payment status tracking
-- Generated columns automatically calculate total amount
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    bill_number VARCHAR(50) UNIQUE NOT NULL, -- Format: INV-YYYYMMDD-001
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0), -- Subtotal before tax and discount
    tax_amount DECIMAL(10,2) DEFAULT 0, -- 15% VAT in Ethiopia
    discount DECIMAL(10,2) DEFAULT 0, -- Any discounts applied
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + tax_amount - discount) STORED,
    payment_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'cancelled', 'refunded')),
    payment_method VARCHAR(30) 
        CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_money', 'insurance')),
    provider VARCHAR(50) CHECK (provider IN ('telebirr', 'cbebirr', 'hellocash', 'amole', 'bank', 'cash')),
    insurance_provider VARCHAR(100), -- If paid by insurance
    insurance_claim_id VARCHAR(100), -- Insurance claim reference
    due_date DATE, -- Payment due date
    paid_date TIMESTAMP, -- When payment was completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payments Table
-- Tracks individual payment transactions
-- One bill can have multiple payments (partial payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE, -- Gateway transaction ID
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ETB', -- Ethiopian Birr
    payment_method VARCHAR(30) NOT NULL,
    payment_gateway VARCHAR(50), -- Telebirr, CBE Birr, etc.
    gateway_reference VARCHAR(100), -- Reference from payment gateway
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    metadata JSONB, -- Stores additional payment details (phone, receipt, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Services Table
-- Catalog of medical services with pricing
-- Used for bill generation and service management
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(50) UNIQUE NOT NULL, -- Short code (e.g., CONSULT, XRAY-CHEST)
    service_name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100), -- Consultation, Laboratory, Radiology, etc.
    duration_minutes INTEGER DEFAULT 30, -- How long the service takes
    is_active BOOLEAN DEFAULT TRUE, -- Can deactivate outdated services
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bill Items Table
-- Line items in a bill, linking services to bills
-- Allows custom items not in services catalog
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id), -- Optional link to service catalog
    service_name VARCHAR(200) NOT NULL, -- Service name at time of billing
    description TEXT, -- Optional description
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);