

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";

const PatientWaitlistPage = () => {
  const { patients, searchPatients, addPatient, updatePatient, appointments } = useApp();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("normal");
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  // Available doctors
  const doctors = [
    { id: 1, name: "Dr. Sarah Johnson", specialty: "Cardiologist" },
    { id: 2, name: "Dr. Michael Chen", specialty: "Neurologist" },
    { id: 3, name: "Dr. Emily Davis", specialty: "Pediatrician" },
    { id: 4, name: "Dr. James Wilson", specialty: "Orthopedic" },
    { id: 5, name: "Dr. Lisa Anderson", specialty: "Dermatologist" },
  ];

  // Search patients
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return searchPatients(searchTerm);
  }, [searchTerm, patients]);

  // Get current waitlist (patients with waitingSince)
  const waitlist = useMemo(() => {
    return patients.filter(p => p.waitingSince && p.doctorId);
  }, [patients]);

  const handleAddToWaitlist = () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!selectedDoctor) {
      toast.error("Please select a doctor");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for visit");
      return;
    }

    const doctor = doctors.find(d => d.id === parseInt(selectedDoctor));
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    // Update patient with waitlist info
    updatePatient(selectedPatient.id, {
      waitingSince: timeString,
      doctorId: parseInt(selectedDoctor),
      doctorName: doctor?.name,
      reason: reason,
      priority: priority,
      status: "waiting",
    });

    toast.success(`${selectedPatient.name} added to ${doctor?.name}'s waitlist`);

    // Reset form
    setSelectedPatient(null);
    setSelectedDoctor("");
    setReason("");
    setPriority("normal");
    setSearchTerm("");
  };

  const handleRemoveFromWaitlist = (patientId) => {
    updatePatient(patientId, {
      waitingSince: null,
      doctorId: null,
      doctorName: null,
      reason: null,
      priority: null,
      status: null,
    });
    toast.success("Patient removed from waitlist");
  };

  const handleQuickAdd = (patient) => {
    setSelectedPatient(patient);
    setSearchTerm("");
  };

  return (
    <div className="patient-waitlist-page" style={{ padding: "24px" }}>
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "var(--med-text-primary)" }}>
            Patient Waitlist Management
          </h1>
          <p style={{ color: "var(--med-text-secondary)", fontSize: "14px" }}>
            Search for registered patients and add them to doctor waitlists
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Search and Add Section */}
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "var(--med-text-primary)" }}>
            Search & Add Patient
          </h2>

          {/* Search Input */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--med-text-primary)" }}>
              Search Patient
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, email, or insurance number..."
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--med-border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Search Results */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: "20px", maxHeight: "300px", overflowY: "auto" }}>
              {searchResults.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handleQuickAdd(patient)}
                      style={{
                        padding: "12px",
                        border: `2px solid ${selectedPatient?.id === patient.id ? "var(--med-primary)" : "var(--med-border)"}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        background: selectedPatient?.id === patient.id ? "#f4f4f5" : "white",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPatient?.id !== patient.id) {
                          e.currentTarget.style.background = "var(--med-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPatient?.id !== patient.id) {
                          e.currentTarget.style.background = "white";
                        }
                      }}
                    >
                      <div style={{ fontWeight: "600", color: "var(--med-text-primary)", marginBottom: "4px" }}>
                        {patient.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                        {patient.phone} • {patient.email || "No email"}
                      </div>
                      {patient.insuranceNumber && (
                        <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                          Insurance: {patient.insuranceNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--med-text-secondary)" }}>
                  No patients found. <button
                    onClick={() => setShowAddPatientModal(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--med-primary)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontWeight: "600",
                    }}
                  >
                    Register new patient
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Selected Patient Info */}
          {selectedPatient && (
            <div style={{
              padding: "16px",
              background: "#f4f4f5",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "2px solid var(--med-primary)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--med-text-primary)", marginBottom: "4px" }}>
                    {selectedPatient.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                    Age: {selectedPatient.age} • {selectedPatient.gender}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "var(--med-text-secondary)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                Phone: {selectedPatient.phone}
              </div>
              {selectedPatient.insuranceProvider && (
                <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                  Insurance: {selectedPatient.insuranceProvider}
                </div>
              )}
            </div>
          )}

          {/* Doctor Selection */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--med-text-primary)" }}>
              Select Doctor *
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--med-border)",
                borderRadius: "8px",
                fontSize: "14px",
                background: "white",
              }}
              required
            >
              <option value="">Choose a doctor...</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Reason for Visit */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--med-text-primary)" }}>
              Reason for Visit *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for visit..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--med-border)",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              required
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--med-text-primary)" }}>
              Priority
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              {["normal", "urgent"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    flex: "1",
                    padding: "12px",
                    border: `2px solid ${priority === p ? "var(--med-primary)" : "var(--med-border)"}`,
                    borderRadius: "8px",
                    background: priority === p ? "#18181b" : "white",
                    color: priority === p ? "white" : "#18181b",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Waitlist Button */}
          <button
            onClick={handleAddToWaitlist}
            disabled={!selectedPatient || !selectedDoctor || !reason.trim()}
            style={{
              width: "100%",
              padding: "14px",
              background: (!selectedPatient || !selectedDoctor || !reason.trim()) ? "#e4e4e7" : "#000000",
              color: (!selectedPatient || !selectedDoctor || !reason.trim()) ? "#a1a1aa" : "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: (!selectedPatient || !selectedDoctor || !reason.trim()) ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            Add to Waitlist
          </button>
        </div>

        {/* Current Waitlist */}
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "var(--med-text-primary)" }}>
            Current Waitlist ({waitlist.length})
          </h2>

          {waitlist.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "600px", overflowY: "auto" }}>
              {waitlist.map((patient) => {
                const doctor = doctors.find(d => d.id === patient.doctorId);
                return (
                  <div
                    key={patient.id}
                    style={{
                      padding: "16px",
                      border: `1px solid ${patient.priority === "urgent" ? "#000000" : "var(--med-border)"}`,
                      borderRadius: "8px",
                      background: patient.priority === "urgent" ? "#fafafa" : "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--med-text-primary)" }}>
                            {patient.name}
                          </div>
                          {patient.priority === "urgent" && (
                            <span style={{
                              padding: "2px 8px",
                              background: "#000000",
                              color: "white",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "700",
                              textTransform: "uppercase",
                            }}>
                              Urgent
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "4px" }}>
                          <strong>Doctor:</strong> {patient.doctorName || doctor?.name || "Unknown"}
                        </div>
                        <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "4px" }}>
                          <strong>Reason:</strong> {patient.reason}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                          Waiting since: {patient.waitingSince}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromWaitlist(patient.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          color: "#000000",
                        }}
                        title="Remove from waitlist"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>
                      Phone: {patient.phone} • Age: {patient.age} • {patient.gender}
                    </div>
                  </div >
                );
              })}
            </div >
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--med-text-secondary)" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.3 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p style={{ margin: 0, fontSize: "14px" }}>No patients in waitlist</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", opacity: 0.7 }}>Search and add patients to get started</p>
            </div>
          )}
        </div >
      </div >
    </div >
  );
};

export default PatientWaitlistPage;

