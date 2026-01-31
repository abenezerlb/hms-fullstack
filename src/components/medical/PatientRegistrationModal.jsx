

import React, { useState } from "react";
import { getRegistrationPrice } from "@/utils/pricing";

const PatientRegistrationModal = ({ isOpen, onClose, appointmentInfo, onSubmit }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyContact: "",
    emergencyPhone: "",
    insuranceProvider: "",
    insuranceNumber: "",
    appointmentTime: "",
    appointmentType: "",
    symptoms: "",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const registrationFee = getRegistrationPrice();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({
      ...formData,
      doctor: appointmentInfo?.doctor,
      date: appointmentInfo?.date,
      registrationFee: registrationFee,
      amount: registrationFee,
      currency: "ETB",
    });
    onClose();
  };

  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Register New Patient</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {appointmentInfo && (
              <div style={{
                padding: "12px 16px",
                backgroundColor: "#f4f4f5",
                borderRadius: "8px",
                marginBottom: "20px",
                borderLeft: "4px solid var(--med-primary)"
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--med-text-secondary)" }}>
                  Appointment with <strong>{appointmentInfo.doctor?.name}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--med-text-secondary)" }}>
                  {formatDate(appointmentInfo.date)} ({appointmentInfo.dayName})
                </p>
              </div>
            )}

            <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "var(--med-text-primary)" }}>
              Personal Information
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth *</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender *</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="patient@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Street Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">ZIP Code</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="12345"
                />
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: "600", margin: "24px 0 16px", color: "var(--med-text-primary)" }}>
              Emergency Contact
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="emergencyContact">Contact Name</label>
                <input
                  type="text"
                  id="emergencyContact"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="Emergency contact name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="emergencyPhone">Contact Phone</label>
                <input
                  type="tel"
                  id="emergencyPhone"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: "600", margin: "24px 0 16px", color: "var(--med-text-primary)" }}>
              Insurance Information
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="insuranceProvider">Insurance Provider</label>
                <input
                  type="text"
                  id="insuranceProvider"
                  name="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={handleChange}
                  placeholder="Provider name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="insuranceNumber">Policy Number</label>
                <input
                  type="text"
                  id="insuranceNumber"
                  name="insuranceNumber"
                  value={formData.insuranceNumber}
                  onChange={handleChange}
                  placeholder="Policy number"
                />
              </div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: "600", margin: "24px 0 16px", color: "var(--med-text-primary)" }}>
              Appointment Details
            </h4>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="appointmentTime">Preferred Time *</label>
                <select
                  id="appointmentTime"
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select time</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="09:30">9:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="13:30">1:30 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="14:30">2:30 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="15:30">3:30 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="16:30">4:30 PM</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="appointmentType">Appointment Type *</label>
                <select
                  id="appointmentType"
                  name="appointmentType"
                  value={formData.appointmentType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select type</option>
                  <option value="new-patient">New Patient Visit</option>
                  <option value="follow-up">Follow-up Visit</option>
                  <option value="consultation">Consultation</option>
                  <option value="routine-checkup">Routine Checkup</option>
                  <option value="emergency">Urgent Care</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="symptoms">Symptoms / Reason for Visit</label>
              <textarea
                id="symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Please describe the reason for your visit..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional information (allergies, medications, etc.)"
                rows={2}
              />
            </div>

            {/* Registration Fee Display */}
            <div style={{
              padding: "16px",
              background: "#18181b",
              color: "white",
              borderRadius: "8px",
              marginTop: "20px",
              border: "1px solid var(--med-primary-light)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "4px" }}>Registration Fee</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--med-primary)" }}>{registrationFee} ETB</div>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "var(--med-primary)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "700"
                }}>
                  ETB
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "var(--med-text-secondary)", margin: "8px 0 0 0" }}>
                Payment will be processed after registration
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Register Patient ({registrationFee} ETB)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default PatientRegistrationModal;
