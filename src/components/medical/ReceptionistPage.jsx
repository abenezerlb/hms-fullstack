

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { getRegistrationPrice, getPharmacyPrice, getLabPrice } from "@/utils/pricing";

const ReceptionistPage = ({ onPatientClick, onPaymentClick }) => {
  const { appointments: contextAppointments, patients, addAppointment, updateAppointment, deleteAppointment, getStats } = useApp();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Get patients from today's appointments who should be on waitlist
  const todayWaitlistPatients = useMemo(() => {
    const todayAppointments = contextAppointments.filter(apt => apt.appointmentDate === today);
    return todayAppointments
      .map(apt => {
        const patient = patients.find(p => p.id === apt.patientId);
        if (!patient) return null;
        return {
          ...patient,
          appointmentTime: apt.appointmentTime,
          appointmentId: apt.id,
          doctor: apt.doctor,
          doctorId: apt.doctorId,
        };
      })
      .filter(Boolean);
  }, [contextAppointments, patients, today]);

  // Use context appointments or fallback to sample data
  const sampleAppointments = [
    {
      id: 1,
      patientName: "John Smith",
      phone: "+1 (555) 123-4567",
      email: "john.smith@email.com",
      appointmentDate: "2024-01-16",
      appointmentTime: "9:00 AM",
      doctor: "Dr. Sarah Johnson",
      reason: "General Checkup",
      status: "confirmed",
      paymentStatus: "paid",
      amount: getRegistrationPrice().toString(),
      currency: "ETB",
    },
    {
      id: 2,
      patientName: "Emily Johnson",
      phone: "+1 (555) 234-5678",
      email: "emily.j@email.com",
      appointmentDate: "2024-01-16",
      appointmentTime: "10:30 AM",
      doctor: "Dr. Michael Chen",
      reason: "Follow-up",
      status: "pending",
      paymentStatus: "pending",
      amount: getRegistrationPrice().toString(),
      currency: "ETB",
    },
    {
      id: 3,
      patientName: "Robert Davis",
      phone: "+1 (555) 345-6789",
      email: "robert.d@email.com",
      appointmentDate: "2024-01-16",
      appointmentTime: "11:00 AM",
      doctor: "Dr. Emily Davis",
      reason: "Consultation",
      status: "confirmed",
      paymentStatus: "pending",
      amount: getRegistrationPrice().toString(),
      currency: "ETB",
    },
    {
      id: 4,
      patientName: "Maria Garcia",
      phone: "+1 (555) 456-7890",
      email: "maria.g@email.com",
      appointmentDate: "2024-01-16",
      appointmentTime: "2:00 PM",
      doctor: "Dr. James Wilson",
      reason: "New Patient",
      status: "pending",
      paymentStatus: "pending",
      amount: getRegistrationPrice().toString(),
      currency: "ETB",
    },
  ];

  // Use context appointments if available, otherwise use sample data
  const appointments = contextAppointments.length > 0 ? contextAppointments : sampleAppointments;

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.phone.includes(searchTerm) ||
      apt.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "status" && apt.status === filterStatus) ||
      (filterStatus === "payment" && apt.paymentStatus === filterStatus);
    return matchesSearch && matchesFilter;
  });

  const appointmentStats = useMemo(() => ({
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    pending: appointments.filter((a) => a.status === "pending").length,
    paid: appointments.filter((a) => a.paymentStatus === "paid").length,
    unpaid: appointments.filter((a) => a.paymentStatus === "pending").length,
  }), [appointments]);

  return (
    <div className="receptionist-page" style={{ padding: "24px" }}>
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "var(--med-text-primary)" }}>
            Reception Dashboard
          </h1>
          <p style={{ color: "var(--med-text-secondary)", fontSize: "14px" }}>
            Manage appointments, patient registrations, and payments
          </p>
        </div>
      </div>

      {/* Today's Waitlist Section */}
      {todayWaitlistPatients.length > 0 && (
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", marginBottom: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", color: "var(--med-text-primary)" }}>
            Today's Waitlist ({todayWaitlistPatients.length})
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {todayWaitlistPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onPatientClick?.(patient)}
                style={{
                  padding: "16px",
                  border: "1px solid var(--med-border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: patient.waitingSince ? "rgba(0, 0, 0, 0.05)" : "var(--med-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--med-primary)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--med-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "16px", color: "var(--med-text-primary)" }}>{patient.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--med-text-secondary)", marginTop: "4px" }}>
                      {patient.appointmentTime} • {patient.doctor}
                    </div>
                  </div>
                  {patient.waitingSince && (
                    <span style={{ fontSize: "11px", color: "var(--med-primary)", fontWeight: "600" }}>ON WAITLIST</span>
                  )}
                </div>
                <div style={{ fontSize: "13px", color: "var(--med-text-secondary)" }}>{patient.reason || "Appointment"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="stat-card" style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "8px" }}>Total Appointments</div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--med-primary)" }}>{appointmentStats.total}</div>
        </div>
        <div className="stat-card" style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "8px" }}>Confirmed</div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#000000" }}>{appointmentStats.confirmed}</div>
        </div>
        <div className="stat-card" style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "8px" }}>Pending</div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#52525b" }}>{appointmentStats.pending}</div>
        </div>
        <div className="stat-card" style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "14px", color: "var(--med-text-secondary)", marginBottom: "8px" }}>Unpaid</div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#000000" }}>{appointmentStats.unpaid}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: "1", minWidth: "300px" }}>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid var(--med-border)",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "12px 16px",
            border: "1px solid var(--med-border)",
            borderRadius: "8px",
            fontSize: "14px",
            background: "white",
          }}
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Appointments Table */}
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--med-secondary)", borderBottom: "1px solid var(--med-border)" }}>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Patient
                </th>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Contact
                </th>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Date & Time
                </th>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Doctor
                </th>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Status
                </th>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Amount
                </th>
                <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Payment
                </th>
                <th style={{ padding: "16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--med-text-secondary)", textTransform: "uppercase" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((apt) => (
                <tr key={apt.id} style={{ borderBottom: "1px solid var(--med-border)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--med-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>{apt.patientName}</div>
                    <div style={{ fontSize: "12px", color: "var(--med-text-secondary)", marginTop: "4px" }}>{apt.reason}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontSize: "14px", color: "var(--med-text-primary)" }}>{apt.phone}</div>
                    <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>{apt.email}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontSize: "14px", color: "var(--med-text-primary)" }}>{apt.appointmentDate}</div>
                    <div style={{ fontSize: "12px", color: "var(--med-text-secondary)" }}>{apt.appointmentTime}</div>
                  </td>
                  <td style={{ padding: "16px", fontSize: "14px", color: "var(--med-text-primary)" }}>{apt.doctor}</td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: apt.status === "confirmed" ? "#f4f4f5" : "#fafafa",
                        color: apt.status === "confirmed" ? "#000000" : "#52525b",
                        border: "1px solid #e4e4e7"
                      }}
                    >
                      {apt.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--med-primary)" }}>
                      {apt.amount || getRegistrationPrice()} {apt.currency || "ETB"}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: apt.paymentStatus === "paid" ? "#f4f4f5" : "#fafafa",
                        color: apt.paymentStatus === "paid" ? "#000000" : "#52525b",
                        border: "1px solid #e4e4e7"
                      }}
                    >
                      {apt.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {apt.paymentStatus === "pending" && (
                        <button
                          onClick={() => onPaymentClick?.(apt)}
                          style={{
                            padding: "6px 12px",
                            background: "var(--med-primary)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--med-primary-dark)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "var(--med-primary)"}
                        >
                          Process Payment
                        </button>
                      )}
                      <button
                        onClick={() => onPatientClick?.(apt)}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          color: "var(--med-primary)",
                          border: "1px solid var(--med-border)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistPage;

