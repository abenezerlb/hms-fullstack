

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";

const LabTechPage = ({ user, labRequests: propLabRequests, onUpdateRequest }) => {
  const { labRequests: contextLabRequests, updateLabRequest } = useApp();
  const toast = useToast();

  // Use context requests if available, otherwise use props
  const labRequests = contextLabRequests.length > 0 ? contextLabRequests : propLabRequests || [];
  const [filter, setFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [results, setResults] = useState("");

  // Lab tech info from logged-in user
  const labTech = {
    name: user?.name || "Lab Technician",
    role: "Lab Technician",
    department: "Clinical Laboratory",
    email: user?.email || "N/A",
    phone: user?.phone || "N/A",
    shift: "Morning Shift (7:00 AM - 3:00 PM)",
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
      tests: "Complete Blood Count (CBC), Lipid Profile, Fasting Blood Sugar, HbA1c",
      status: "pending",
      timestamp: "2024-01-15T09:30:00",
      priority: "urgent",
    },
    {
      id: 2,
      patientName: "Emily Johnson",
      patientAge: 32,
      patientGender: "Female",
      doctorName: "Dr. Sarah Wilson",
      tests: "Thyroid Panel (T3, T4, TSH), Vitamin D, Vitamin B12",
      status: "in-progress",
      timestamp: "2024-01-15T10:00:00",
      priority: "normal",
    },
    {
      id: 3,
      patientName: "Robert Davis",
      patientAge: 58,
      patientGender: "Male",
      doctorName: "Dr. James Anderson",
      tests: "Liver Function Test (LFT), Kidney Function Test (KFT), Urine Analysis",
      status: "completed",
      timestamp: "2024-01-15T08:00:00",
      priority: "normal",
      results: "LFT: Normal, KFT: Creatinine slightly elevated (1.4 mg/dL), Urine: No abnormalities",
    },
    {
      id: 4,
      patientName: "Maria Garcia",
      patientAge: 28,
      patientGender: "Female",
      doctorName: "Dr. Sarah Wilson",
      tests: "Pregnancy Test, Complete Blood Count, Blood Type",
      status: "pending",
      timestamp: "2024-01-15T10:30:00",
      priority: "urgent",
    },
  ];

  const allRequests = labRequests.length > 0 ? labRequests : sampleRequests;

  const filteredRequests = allRequests.filter((req) => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const getStatusCount = (status) => {
    return allRequests.filter((req) => req.status === status).length;
  };

  const handleStartProgress = (request) => {
    const updated = { ...request, status: "in-progress" };
    updateLabRequest(request.id, updated);
    if (onUpdateRequest) {
      onUpdateRequest(updated);
    }
    toast.info(`Started processing tests for ${request.patientName}`);
  };

  const handleComplete = (request) => {
    setSelectedRequest(request);
  };

  const handleSubmitResults = () => {
    if (!results.trim()) {
      toast.error("Please enter the test results");
      return;
    }
    const updated = { ...selectedRequest, status: "completed", results: results, completedAt: new Date().toISOString() };
    updateLabRequest(selectedRequest.id, updated);
    if (onUpdateRequest) {
      onUpdateRequest(updated);
    }
    toast.success(`Lab results completed for ${selectedRequest.patientName}`);
    alert(`Results submitted for ${selectedRequest.patientName}`);
    setSelectedRequest(null);
    setResults("");
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

  return (
    <div className="lab-tech-page">
      {/* Lab Tech Profile Card */}
      <div className="staff-profile-card">
        <div className="staff-profile-avatar lab">{labTech.name.split(" ").map((n) => n[0]).join("")}</div>
        <div className="staff-profile-info">
          <h2>{labTech.name}</h2>
          <div className="staff-profile-role lab">{labTech.role}</div>
          <div className="staff-profile-meta">
            {labTech.department} | {labTech.shift}
          </div>
        </div>
        <div className="staff-profile-stats">
          <div className="staff-stat">
            <div className="staff-stat-value lab">{getStatusCount("pending")}</div>
            <div className="staff-stat-label">Pending</div>
          </div>
          <div className="staff-stat">
            <div className="staff-stat-value lab">{getStatusCount("in-progress")}</div>
            <div className="staff-stat-label">In Progress</div>
          </div>
          <div className="staff-stat">
            <div className="staff-stat-value lab">{getStatusCount("completed")}</div>
            <div className="staff-stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Lab Requests Section */}
      <div className="patients-waiting-section">
        <div className="section-header">
          <h3>
            <LabIcon />
            Lab Test Requests
          </h3>
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All ({allRequests.length})
            </button>
            <button className={`filter-tab ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>
              Pending ({getStatusCount("pending")})
            </button>
            <button className={`filter-tab ${filter === "in-progress" ? "active" : ""}`} onClick={() => setFilter("in-progress")}>
              In Progress ({getStatusCount("in-progress")})
            </button>
            <button className={`filter-tab ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>
              Completed ({getStatusCount("completed")})
            </button>
          </div>
        </div>

        <div className="requests-grid">
          {filteredRequests.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <LabIcon />
              <h4>No Requests</h4>
              <p>No lab test requests match the current filter</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-card-header">
                  <h4>{request.patientName}</h4>
                  <span className={`request-status ${request.status}`}>
                    {request.status.replace("-", " ")}
                  </span>
                </div>
                <div className="request-card-body">
                  <div className="request-info-row">
                    <label>Age / Gender</label>
                    <span>{request.patientAge} yrs, {request.patientGender}</span>
                  </div>
                  <div className="request-info-row">
                    <label>Requested By</label>
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
                  <div className="request-tests">
                    <h5>Tests Required</h5>
                    <p>{request.tests}</p>
                  </div>
                  {request.status === "completed" && request.results && (
                    <div className="request-tests">
                      <h5>Results</h5>
                      <p>{request.results}</p>
                    </div>
                  )}
                </div>
                <div className="request-card-footer">
                  {request.status === "pending" && (
                    <button className="btn-action progress" onClick={() => handleStartProgress(request)}>
                      <PlayIcon />
                      Start Processing
                    </button>
                  )}
                  {request.status === "in-progress" && (
                    <button className="btn-action complete" onClick={() => handleComplete(request)}>
                      <CheckIcon />
                      Enter Results
                    </button>
                  )}
                  {request.status === "completed" && (
                    <button className="btn-action complete" disabled>
                      <CheckIcon />
                      Completed
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Results Entry Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3>Enter Test Results</h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="info-card" style={{ marginBottom: "20px", padding: "16px", backgroundColor: "var(--med-secondary)", borderRadius: "var(--med-radius)" }}>
                <p style={{ margin: "0 0 8px 0" }}><strong>Patient:</strong> {selectedRequest.patientName}</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Tests:</strong> {selectedRequest.tests}</p>
                <p style={{ margin: "0" }}><strong>Requested by:</strong> {selectedRequest.doctorName}</p>
              </div>
              <div className="form-group">
                <label>Test Results</label>
                <textarea
                  value={results}
                  onChange={(e) => setResults(e.target.value)}
                  placeholder="Enter detailed test results here..."
                  rows={6}
                  style={{ width: "100%", padding: "12px", border: "1px solid var(--med-border)", borderRadius: "var(--med-radius)", fontSize: "14px" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSubmitResults}>
                <CheckIcon />
                Submit Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Icon Components
const LabIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M9 3h6v2H9z" />
    <path d="M10 5v6l-4 8h12l-4-8V5" />
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

export default LabTechPage;
