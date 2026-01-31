
import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { getPharmacyPrice, getLabPrice } from "@/utils/pricing";

const DoctorPage = ({ doctor, onBack, onSendToLab, onSendToPharmacy }) => {
  const { patients, labRequests, addConsultation, completeConsultation, updateConsultation } = useApp();
  const toast = useToast();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [labTests, setLabTests] = useState("");
  const [medications, setMedications] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [examination, setExamination] = useState("");
  const [treatment, setTreatment] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [currentConsultation, setCurrentConsultation] = useState(null);

  // Get waiting patients from context (patients with waitingSince and matching doctorId)
  const waitingPatientsFromContext = useMemo(() => {
    if (!doctor?.id) return [];
    return patients.filter(p => p.waitingSince && p.doctorId === doctor.id);
  }, [patients, doctor?.id]);

  // Sample waiting patients data (fallback if no patients in context)
  const sampleWaitingPatients = [
    {
      id: 1,
      name: "John Smith",
      age: 45,
      gender: "Male",
      phone: "+1 (555) 123-4567",
      email: "john.smith@email.com",
      address: "123 Main St, New York, NY 10001",
      bloodType: "A+",
      allergies: "Penicillin",
      emergencyContact: "Jane Smith - +1 (555) 987-6543",
      insuranceProvider: "Blue Cross",
      insuranceNumber: "BC-123456789",
      waitingSince: "9:00 AM",
      reason: "Chest pain and shortness of breath",
      vitals: { bp: "130/85", pulse: "88", temp: "98.6°F", weight: "180 lbs" },
    },
    {
      id: 2,
      name: "Emily Johnson",
      age: 32,
      gender: "Female",
      phone: "+1 (555) 234-5678",
      email: "emily.j@email.com",
      address: "456 Oak Ave, Brooklyn, NY 11201",
      bloodType: "O-",
      allergies: "None",
      emergencyContact: "Mike Johnson - +1 (555) 876-5432",
      insuranceProvider: "Aetna",
      insuranceNumber: "AE-987654321",
      waitingSince: "9:30 AM",
      reason: "Persistent headache for 3 days",
      vitals: { bp: "120/80", pulse: "72", temp: "99.1°F", weight: "145 lbs" },
    },
    {
      id: 3,
      name: "Robert Davis",
      age: 58,
      gender: "Male",
      phone: "+1 (555) 345-6789",
      email: "r.davis@email.com",
      address: "789 Pine St, Queens, NY 11375",
      bloodType: "B+",
      allergies: "Aspirin, Sulfa drugs",
      emergencyContact: "Sarah Davis - +1 (555) 765-4321",
      insuranceProvider: "United Health",
      insuranceNumber: "UH-456789123",
      waitingSince: "10:00 AM",
      reason: "Follow-up for diabetes management",
      vitals: { bp: "145/92", pulse: "80", temp: "98.4°F", weight: "210 lbs" },
    },
    {
      id: 4,
      name: "Maria Garcia",
      age: 28,
      gender: "Female",
      phone: "+1 (555) 456-7890",
      email: "maria.g@email.com",
      address: "321 Elm Rd, Bronx, NY 10451",
      bloodType: "AB+",
      allergies: "Latex",
      emergencyContact: "Carlos Garcia - +1 (555) 654-3210",
      insuranceProvider: "Cigna",
      insuranceNumber: "CG-789123456",
      waitingSince: "10:15 AM",
      reason: "Severe abdominal pain",
      vitals: { bp: "118/76", pulse: "92", temp: "100.2°F", weight: "130 lbs" },
    },
  ];

  // Get waiting patients from context or use sample data
  const waitingPatients = waitingPatientsFromContext.length > 0
    ? waitingPatientsFromContext
    : sampleWaitingPatients;

  // Get lab results for selected patient
  const patientLabResults = useMemo(() => {
    if (!selectedPatient || !labRequests || labRequests.length === 0) return [];
    return labRequests.filter(
      (req) =>
        req.status === "completed" &&
        (req.patientId === selectedPatient.id || req.patientName === selectedPatient.name)
    );
  }, [labRequests, selectedPatient]);

  const currentDoctor = doctor || {
    name: "Dr. Unknown",
    specialty: "General Medicine",
    email: "",
    phone: "",
    licenseNo: "",
    experience: "",
    education: "",
    avatar: "?",
  };

  const handleStartConsultation = (patient) => {
    setSelectedPatient(patient);
    const consultation = addConsultation({
      patientId: patient.id,
      patientName: patient.name,
      doctorName: currentDoctor.name,
      doctorId: doctor?.id,
      chiefComplaint: patient.reason || "",
      vitals: patient.vitals || {},
    });
    setCurrentConsultation(consultation);
    toast.info(`Started consultation with ${patient.name}`);
  };

  const handleCompleteConsultation = () => {
    if (!currentConsultation || !diagnosis.trim()) {
      toast.error("Please enter a diagnosis before completing consultation");
      return;
    }

    completeConsultation(currentConsultation.id, {
      symptoms,
      examination,
      diagnosis,
      treatment,
      notes: consultationNotes,
    });

    toast.success(`Consultation completed for ${selectedPatient.name}`);
    setSelectedPatient(null);
    setCurrentConsultation(null);
    // Reset form
    setSymptoms("");
    setExamination("");
    setDiagnosis("");
    setTreatment("");
    setConsultationNotes("");
    setLabTests("");
    setMedications("");
  };

  const handleSendToLab = () => {
    if (!labTests.trim()) {
      toast.error("Please enter lab tests");
      return;
    }
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    const labRequest = {
      patientName: selectedPatient.name,
      patientId: selectedPatient.id,
      patientAge: selectedPatient.age,
      patientGender: selectedPatient.gender,
      doctorName: currentDoctor.name,
      doctorId: doctor?.id,
      tests: labTests,
      priority: selectedPatient.reason?.toLowerCase().includes("pain") ? "urgent" : "normal",
      consultationId: currentConsultation?.id,
      amount: getLabPrice(),
      currency: "ETB",
    };

    if (onSendToLab) {
      onSendToLab(labRequest);
    }

    setLabTests("");
  };

  const handleSendToPharmacy = () => {
    if (!medications.trim()) {
      toast.error("Please enter medications");
      return;
    }
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    const pharmacyRequest = {
      patientName: selectedPatient.name,
      patientAge: selectedPatient.age,
      patientGender: selectedPatient.gender,
      doctorName: currentDoctor.name,
      medications: medications,
      consultationId: currentConsultation?.id,
      amount: getPharmacyPrice(),
      currency: "ETB",
    };

    if (onSendToPharmacy) {
      onSendToPharmacy(pharmacyRequest);
    }

    setMedications("");
  };

  const handleSaveDiagnosis = () => {
    if (!diagnosis.trim()) {
      toast.error("Please enter a diagnosis");
      return;
    }
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (currentConsultation) {
      updateConsultation(currentConsultation.id, { diagnosis });
      toast.success("Diagnosis saved");
    } else {
      toast.info("Diagnosis will be saved when you complete the consultation");
    }
  };

  return (
    <div className="doctor-page">
      {/* Doctor Profile Section */}
      <div className="doctor-profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large">{currentDoctor.avatar || currentDoctor.name.charAt(0)}</div>
          <div className="profile-info">
            <h2>{currentDoctor.name}</h2>
            <p className="specialty">{currentDoctor.specialty}</p>
            <div className="profile-badges">
              <span className="badge badge-primary">On Duty</span>
              <span className="badge badge-success">{waitingPatients.length} Patients Waiting</span>
            </div>
          </div>
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-number">156</span>
              <span className="stat-label">Patients This Month</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{currentDoctor.experience}</span>
              <span className="stat-label">Experience</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">4.9</span>
              <span className="stat-label">Rating</span>
            </div>
          </div>
        </div>
        <div className="profile-details">
          <div className="detail-item">
            <EmailIcon />
            <span>{currentDoctor.email}</span>
          </div>
          <div className="detail-item">
            <PhoneIcon />
            <span>{currentDoctor.phone}</span>
          </div>
          <div className="detail-item">
            <LicenseIcon />
            <span>License: {currentDoctor.licenseNo}</span>
          </div>
          <div className="detail-item">
            <EducationIcon />
            <span>{currentDoctor.education}</span>
          </div>
        </div>
      </div>

      <div className="doctor-content">
        {/* Patients Waiting List */}
        <div className="waiting-list-section">
          <div className="section-header">
            <h3>
              <QueueIcon />
              Patients Waiting
            </h3>
            <span className="patient-count">{waitingPatients.length} in queue</span>
          </div>
          <div className="patients-list">
            {waitingPatients.map((patient) => (
              <div
                key={patient.id}
                className={`patient-card ${selectedPatient?.id === patient.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedPatient(patient);
                  setLabTests("");
                  setMedications("");
                  setDiagnosis("");
                }}
              >
                <div className="patient-avatar">{patient.name.charAt(0)}</div>
                <div className="patient-brief">
                  <h4>{patient.name}</h4>
                  <p>
                    {patient.age} yrs, {patient.gender}
                  </p>
                  <span className="waiting-time">
                    <ClockIcon />
                    Since {patient.waitingSince}
                  </span>
                </div>
                <div className="patient-reason">
                  <span className="reason-tag">{patient.reason.substring(0, 30)}...</span>
                </div>
                <ChevronRightIcon />
              </div>
            ))}
          </div>
        </div>

        {/* Selected Patient Detail */}
        {selectedPatient ? (
          <div className="patient-detail-section">
            <div className="section-header">
              <h3>
                <PatientIcon />
                Patient Details
              </h3>
              <button className="btn btn-secondary" onClick={() => setSelectedPatient(null)}>
                Close
              </button>
            </div>

            <div className="patient-full-profile">
              {/* Patient Info */}
              <div className="info-card">
                <div className="patient-header">
                  <div className="patient-avatar-large">{selectedPatient.name.charAt(0)}</div>
                  <div>
                    <h3>{selectedPatient.name}</h3>
                    <p>
                      {selectedPatient.age} years old | {selectedPatient.gender} | Blood Type: {selectedPatient.bloodType}
                    </p>
                  </div>
                </div>

                <div className="info-grid">
                  <div className="info-item">
                    <label>Phone</label>
                    <span>{selectedPatient.phone}</span>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <span>{selectedPatient.email}</span>
                  </div>
                  <div className="info-item">
                    <label>Address</label>
                    <span>{selectedPatient.address}</span>
                  </div>
                  <div className="info-item">
                    <label>Insurance</label>
                    <span>
                      {selectedPatient.insuranceProvider} - {selectedPatient.insuranceNumber}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Emergency Contact</label>
                    <span>{selectedPatient.emergencyContact}</span>
                  </div>
                  <div className="info-item">
                    <label>Allergies</label>
                    <span className={selectedPatient.allergies !== "None" ? "allergy-warning" : ""}>
                      {selectedPatient.allergies}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vitals */}
              <div className="vitals-card">
                <h4>Current Vitals</h4>
                <div className="vitals-grid">
                  <div className="vital-item">
                    <HeartIcon />
                    <span className="vital-value">{selectedPatient.vitals?.bp || 'N/A'}</span>
                    <span className="vital-label">Blood Pressure</span>
                  </div>
                  <div className="vital-item">
                    <PulseIcon />
                    <span className="vital-value">{selectedPatient.vitals?.pulse ? `${selectedPatient.vitals.pulse} bpm` : 'N/A'}</span>
                    <span className="vital-label">Pulse Rate</span>
                  </div>
                  <div className="vital-item">
                    <TempIcon />
                    <span className="vital-value">{selectedPatient.vitals?.temp || 'N/A'}</span>
                    <span className="vital-label">Temperature</span>
                  </div>
                  <div className="vital-item">
                    <WeightIcon />
                    <span className="vital-value">{selectedPatient.vitals?.weight || 'N/A'}</span>
                    <span className="vital-label">Weight</span>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="complaint-card">
                <h4>Chief Complaint</h4>
                <p>{selectedPatient.reason}</p>
              </div>

              {/* Actions Section */}
              <div className="actions-section">
                {/* Lab Tests */}
                <div className="action-card">
                  <div className="action-header">
                    <LabIcon />
                    <h4>Send Lab Tests</h4>
                  </div>
                  <div className="action-body">
                    <textarea
                      placeholder="Enter required lab tests (e.g., CBC, Blood Sugar, Lipid Profile, Urine Analysis...)"
                      value={labTests}
                      onChange={(e) => setLabTests(e.target.value)}
                      rows={3}
                    />
                    <button className="btn btn-lab" onClick={handleSendToLab} disabled={!labTests.trim()}>
                      <SendIcon />
                      Send to Lab Tech
                    </button>
                  </div>
                </div>

                {/* Medications */}
                <div className="action-card">
                  <div className="action-header">
                    <PharmacyIcon />
                    <h4>Prescribe Medications</h4>
                  </div>
                  <div className="action-body">
                    <textarea
                      placeholder="Enter medications with dosage (e.g., Amoxicillin 500mg - 3 times daily for 7 days...)"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      rows={3}
                    />
                    <button className="btn btn-pharmacy" onClick={handleSendToPharmacy} disabled={!medications.trim()}>
                      <SendIcon />
                      Send to Pharmacy
                    </button>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="action-card diagnosis-card">
                  <div className="action-header">
                    <DiagnosisIcon />
                    <h4>Patient Diagnosis</h4>
                  </div>
                  <div className="action-body">
                    <textarea
                      placeholder="Enter the patient's diagnosis and condition details..."
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      rows={4}
                    />
                    <button className="btn btn-primary" onClick={handleSaveDiagnosis} disabled={!diagnosis.trim()}>
                      <SaveIcon />
                      Save Diagnosis
                    </button>
                  </div>
                </div>
              </div>

              {/* Lab Results Section */}
              {patientLabResults.length > 0 && (
                <div className="lab-results-section">
                  <div className="section-header">
                    <h3>
                      <LabIcon />
                      Lab Test Results
                    </h3>
                  </div>
                  <div className="lab-results-list">
                    {patientLabResults.map((labRequest) => (
                      <div key={labRequest.id} className="lab-result-card">
                        <div className="lab-result-header">
                          <div>
                            <h4>Lab Test Results</h4>
                            <p className="lab-result-date">
                              Completed: {labRequest.completedAt
                                ? new Date(labRequest.completedAt).toLocaleString()
                                : new Date(labRequest.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {labRequest.priority === "urgent" && (
                            <span className="badge badge-error">URGENT</span>
                          )}
                        </div>
                        <div className="lab-result-tests">
                          <h5>Tests Requested:</h5>
                          <p>{labRequest.tests}</p>
                        </div>
                        {labRequest.results && (
                          <div className="lab-result-results">
                            <h5>Results:</h5>
                            <div className="lab-result-content">
                              {labRequest.results.split('\n').map((line, idx) => (
                                <p key={idx} style={{ margin: '4px 0' }}>{line}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-patient-selected">
            <div className="empty-state">
              <PatientIcon />
              <h3>No Patient Selected</h3>
              <p>Click on a patient from the waiting list to view their details and provide consultation.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Icon Components
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const LicenseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="13" y2="12" />
    <line x1="7" y1="16" x2="10" y2="16" />
  </svg>
);

const EducationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const QueueIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PatientIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const TempIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const WeightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <circle cx="12" cy="5" r="3" />
    <path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z" />
  </svg>
);

const LabIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M9 3h6v2H9z" />
    <path d="M10 5v6l-4 8h12l-4-8V5" />
  </svg>
);

const PharmacyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const DiagnosisIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h11l5 5v11a2 2 0 0 0-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

export default DoctorPage;
