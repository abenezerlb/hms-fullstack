

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";

const PharmacyPage = ({ user, pharmacyRequests: propPharmacyRequests, onUpdateRequest }) => {
  const { pharmacyRequests: contextPharmacyRequests, updatePharmacyRequest } = useApp();
  const toast = useToast();

  // Use context requests if available, otherwise use props
  const pharmacyRequests = contextPharmacyRequests.length > 0 ? contextPharmacyRequests : propPharmacyRequests || [];
  const [filter, setFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dispensingNotes, setDispensingNotes] = useState("");

  // Pharmacist info from logged-in user
  const pharmacist = {
    name: user?.name || "Pharmacist",
    role: "Pharmacist",
    department: "Hospital Pharmacy",
    email: user?.email || "N/A",
    phone: user?.phone || "N/A",
    license: "PharmD-2019-78901",
    yearsExperience: user?.yearsExperience || "N/A",
    university: user?.university || "N/A",
  };

  // Sample requests if none provided
  const sampleRequests = [
    {
      id: 1,
      patientName: "John Smith",
      patientAge: 45,
      patientGender: "Male",
      doctorName: "Dr. Sarah Wilson",
      medications: "1. Metformin 500mg - Take 1 tablet twice daily with meals\n2. Lisinopril 10mg - Take 1 tablet once daily in the morning\n3. Atorvastatin 20mg - Take 1 tablet at bedtime",
      status: "pending",
      timestamp: "2024-01-15T09:45:00",
      priority: "normal",
    },
    {
      id: 2,
      patientName: "Emily Johnson",
      patientAge: 32,
      patientGender: "Female",
      doctorName: "Dr. Sarah Wilson",
      medications: "1. Levothyroxine 50mcg - Take 1 tablet on empty stomach, 30 min before breakfast\n2. Vitamin D3 1000IU - Take 1 capsule daily with food",
      status: "in-progress",
      timestamp: "2024-01-15T10:15:00",
      priority: "normal",
    },
    {
      id: 3,
      patientName: "Robert Davis",
      patientAge: 58,
      patientGender: "Male",
      doctorName: "Dr. James Anderson",
      medications: "1. Amlodipine 5mg - Take 1 tablet once daily\n2. Omeprazole 20mg - Take 1 capsule before breakfast\n3. Aspirin 81mg - Take 1 tablet daily with food",
      status: "dispensed",
      timestamp: "2024-01-15T08:30:00",
      priority: "normal",
      dispensedAt: "2024-01-15T09:00:00",
    },
    {
      id: 4,
      patientName: "Maria Garcia",
      patientAge: 28,
      patientGender: "Female",
      doctorName: "Dr. Sarah Wilson",
      medications: "1. Amoxicillin 500mg - Take 1 capsule three times daily for 7 days\n2. Ibuprofen 400mg - Take 1 tablet every 6 hours as needed for pain\n3. Prenatal Vitamins - Take 1 tablet daily",
      status: "pending",
      timestamp: "2024-01-15T10:45:00",
      priority: "urgent",
    },
  ];

  const allRequests = pharmacyRequests.length > 0 ? pharmacyRequests : sampleRequests;

  const filteredRequests = allRequests.filter((req) => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const getStatusCount = (status) => {
    return allRequests.filter((req) => req.status === status).length;
  };

  const handleStartPreparing = (request) => {
    const updated = { ...request, status: "in-progress" };
    updatePharmacyRequest(request.id, updated);
    if (onUpdateRequest) {
      onUpdateRequest(updated);
    }
    toast.info(`Started preparing prescription for ${request.patientName}`);
  };

  const handleDispense = (request) => {
    setSelectedRequest(request);
  };

  const handleConfirmDispense = () => {
    if (!dispensingNotes.trim()) {
      toast.warning("Please add dispensing notes");
      return;
    }
    const updated = {
      ...selectedRequest,
      status: "dispensed",
      dispensedAt: new Date().toISOString(),
      dispensingNotes: dispensingNotes
    };
    updatePharmacyRequest(selectedRequest.id, updated);
    if (onUpdateRequest) {
      onUpdateRequest(updated);
    }
    toast.success(`Prescription dispensed for ${selectedRequest.patientName}`);
    alert(`Medications dispensed for ${selectedRequest.patientName}`);
    setSelectedRequest(null);
    setDispensingNotes("");
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseMedications = (medsString) => {
    return medsString.split("\n").filter((med) => med.trim());
  };

  return (
    <div className="lab-tech-page">
      {/* Pharmacist Profile Card */}
      <div className="staff-profile-card">
        <div className="staff-profile-avatar pharmacy">{pharmacist.name.split(" ").filter((_, i) => i === 0 || i === 1).map((n) => n[0]).join("")}</div>
        <div className="staff-profile-info">
          <h2>{pharmacist.name}</h2>
          <div className="staff-profile-role pharmacy">{pharmacist.role}</div>
          <div className="staff-profile-meta">
            {pharmacist.department} | License: {pharmacist.license}
          </div>
        </div>
        <div className="staff-profile-stats">
          <div className="staff-stat">
            <div className="staff-stat-value pharmacy">{getStatusCount("pending")}</div>
            <div className="staff-stat-label">Pending</div>
          </div>
          <div className="staff-stat">
            <div className="staff-stat-value pharmacy">{getStatusCount("in-progress")}</div>
            <div className="staff-stat-label">Preparing</div>
          </div>
          <div className="staff-stat">
            <div className="staff-stat-value pharmacy">{getStatusCount("dispensed")}</div>
            <div className="staff-stat-label">Dispensed</div>
          </div>
        </div>
      </div>

      {/* Prescription Requests Section */}
      <div className="patients-waiting-section">
        <div className="section-header">
          <h3>
            <PharmacyIcon />
            Prescription Orders
          </h3>
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All ({allRequests.length})
            </button>
            <button className={`filter-tab ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>
              Pending ({getStatusCount("pending")})
            </button>
            <button className={`filter-tab ${filter === "in-progress" ? "active" : ""}`} onClick={() => setFilter("in-progress")}>
              Preparing ({getStatusCount("in-progress")})
            </button>
            <button className={`filter-tab ${filter === "dispensed" ? "active" : ""}`} onClick={() => setFilter("dispensed")}>
              Dispensed ({getStatusCount("dispensed")})
            </button>
          </div>
        </div>

        <div className="requests-grid">
          {filteredRequests.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <PharmacyIcon />
              <h4>No Prescriptions</h4>
              <p>No prescriptions match the current filter</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-header">
                  <h4>{request.patientName}</h4>
                  <span className={`request-status ${request.status}`}>
                    {request.status === "in-progress" ? "Preparing" : request.status}
                  </span>
                </div>
                <div className="request-card-body">
                  <div className="request-info-row">
                    <label>Age / Gender</label>
                    <span>{request.patientAge} yrs, {request.patientGender}</span>
                  </div>
                  <div className="request-info-row">
                    <label>Prescribed By</label>
                    <span>{request.doctorName}</span>
                  </div>
                  <div className="request-info-row">
                    <label>Received</label>
                    <span>{formatDate(request.timestamp)}</span>
                  </div>
                  {request.priority === "urgent" && (
                    <div className="request-info-row">
                      <label>Priority</label>
                      <span style={{ color: "var(--med-error)", fontWeight: "600" }}>URGENT</span>
                    </div>
                  )}
                  {request.amount && (
                    <div className="request-info-row">
                      <label>Price</label>
                      <span style={{ color: "var(--med-primary)", fontWeight: "700", fontSize: "16px" }}>{request.amount} {request.currency || "ETB"}</span>
                    </div>
                  )}
                  {request.dispensedAt && (
                    <div className="request-info-row">
                      <label>Dispensed At</label>
                      <span>{formatDate(request.dispensedAt)}</span>
                    </div>
                  )}
                  <div className="request-tests">
                    <h5>Medications</h5>
                    <ul className="medication-list">
                      {parseMedications(request.medications).map((med, index) => (
                        <li key={index} className="medication-item">
                          <span className="medication-name">{med}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="request-card-footer">
                  {request.status === "pending" && (
                    <button className="btn-action progress" onClick={() => handleStartPreparing(request)}>
                      <PlayIcon />
                      Start Preparing
                    </button>
                  )}
                  {request.status === "in-progress" && (
                    <button className="btn-action complete" onClick={() => handleDispense(request)}>
                      <CheckIcon />
                      Dispense
                    </button>
                  )}
                  {request.status === "dispensed" && (
                    <button className="btn-action complete" disabled>
                      <CheckIcon />
                      Dispensed
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dispensing Confirmation Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3>Confirm Dispensing</h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="info-card" style={{ marginBottom: "20px", padding: "16px", backgroundColor: "var(--med-secondary)", borderRadius: "var(--med-radius)" }}>
                <p style={{ margin: "0 0 8px 0" }}><strong>Patient:</strong> {selectedRequest.patientName}</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Prescribed by:</strong> {selectedRequest.doctorName}</p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "14px", marginBottom: "12px", color: "var(--med-text-secondary)" }}>MEDICATIONS TO DISPENSE</h4>
                <ul className="medication-list">
                  {parseMedications(selectedRequest.medications).map((med, index) => (
                    <li key={index} className="medication-item">
                      <span className="medication-name">{med}</span>
                      <CheckIcon />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="form-group">
                <label>Dispensing Notes (Optional)</label>
                <textarea
                  value={dispensingNotes}
                  onChange={(e) => setDispensingNotes(e.target.value)}
                  placeholder="Add any notes about the dispensing (e.g., patient counseling provided, generic substitution made...)"
                  rows={3}
                  style={{ width: "100%", padding: "12px", border: "1px solid var(--med-border)", borderRadius: "var(--med-radius)", fontSize: "14px" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleConfirmDispense}>
                <CheckIcon />
                Confirm & Dispense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Icon Components
const PharmacyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default PharmacyPage;
