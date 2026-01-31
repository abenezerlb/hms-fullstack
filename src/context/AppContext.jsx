

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * Application Context
 * Centralized state management for appointments, patients, lab/pharmacy requests
 */

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

// LocalStorage keys
const STORAGE_KEYS = {
  APPOINTMENTS: "medschedule_appointments",
  PATIENTS: "medschedule_patients",
  LAB_REQUESTS: "medschedule_lab_requests",
  PHARMACY_REQUESTS: "medschedule_pharmacy_requests",

  CONSULTATIONS: "medschedule_consultations",
  USERS: "medschedule_users",
};

// Helper functions for localStorage
const loadFromStorage = (key, defaultValue = []) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return defaultValue;
  }
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const AppProvider = ({ children }) => {
  // State
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [pharmacyRequests, setPharmacyRequests] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    setAppointments(loadFromStorage(STORAGE_KEYS.APPOINTMENTS, getDefaultAppointments()));
    setPatients(loadFromStorage(STORAGE_KEYS.PATIENTS, getDefaultPatients()));
    setLabRequests(loadFromStorage(STORAGE_KEYS.LAB_REQUESTS, []));
    setPharmacyRequests(loadFromStorage(STORAGE_KEYS.PHARMACY_REQUESTS, []));
    setPharmacyRequests(loadFromStorage(STORAGE_KEYS.PHARMACY_REQUESTS, []));
    setConsultations(loadFromStorage(STORAGE_KEYS.CONSULTATIONS, []));

    // Initialize users - if empty, add default admin
    const storedUsers = loadFromStorage(STORAGE_KEYS.USERS, []);
    if (storedUsers.length === 0) {
      const defaultAdmin = {
        id: "admin-1",
        name: "System Administrator",
        username: "admin",
        password: "admin123", // In a real app, this should be hashed
        role: "Admin",
        createdAt: new Date().toISOString()
      };
      setUsers([defaultAdmin]);
      saveToStorage(STORAGE_KEYS.USERS, [defaultAdmin]);
    } else {
      setUsers(storedUsers);
    }

    setLoading(false);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!loading) {
      saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
    }
  }, [appointments, loading]);

  useEffect(() => {
    if (!loading) {
      saveToStorage(STORAGE_KEYS.PATIENTS, patients);
    }
  }, [patients, loading]);

  useEffect(() => {
    if (!loading) {
      saveToStorage(STORAGE_KEYS.LAB_REQUESTS, labRequests);
    }
  }, [labRequests, loading]);

  useEffect(() => {
    if (!loading) {
      saveToStorage(STORAGE_KEYS.PHARMACY_REQUESTS, pharmacyRequests);
    }
  }, [pharmacyRequests, loading]);

  useEffect(() => {
    if (!loading) {
      saveToStorage(STORAGE_KEYS.CONSULTATIONS, consultations);
    }
  }, [consultations, loading]);

  useEffect(() => {
    if (!loading) {
      saveToStorage(STORAGE_KEYS.USERS, users);
    }
  }, [users, loading]);

  // Automatically add patients to waitlist on appointment date
  useEffect(() => {
    if (loading) return;

    const today = new Date().toISOString().split("T")[0];

    // Find appointments for today that haven't been added to waitlist
    const todayAppointments = appointments.filter(apt => {
      if (apt.appointmentDate !== today) return false;
      if (!apt.patientId || !apt.doctorId) return false;

      // Check if patient is already on waitlist for this doctor
      const patient = patients.find(p => p.id === apt.patientId);
      if (patient && patient.waitingSince && patient.doctorId === apt.doctorId) {
        return false; // Already on waitlist
      }

      return true;
    });

    // Add patients to waitlist
    if (todayAppointments.length > 0) {
      setPatients(prevPatients =>
        prevPatients.map(patient => {
          const appointment = todayAppointments.find(apt => apt.patientId === patient.id);
          if (appointment && !patient.waitingSince) {
            return {
              ...patient,
              waitingSince: new Date().toISOString(),
              doctorId: appointment.doctorId,
              doctorName: appointment.doctor,
              reason: appointment.reason || "Appointment",
              priority: appointment.priority || "normal",
            };
          }
          return patient;
        })
      );
    }
  }, [appointments, patients, loading]);

  // Appointment methods
  const addAppointment = useCallback((appointment) => {
    const newAppointment = {
      ...appointment,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    setAppointments((prev) => [...prev, newAppointment]);
    return newAppointment;
  }, []);

  const updateAppointment = useCallback((id, updates) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, ...updates, updatedAt: new Date().toISOString() } : apt))
    );
  }, []);

  const deleteAppointment = useCallback((id) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  }, []);

  const getAppointmentsByDate = useCallback((date) => {
    return appointments.filter((apt) => apt.appointmentDate === date);
  }, [appointments]);

  // Patient methods
  const addPatient = useCallback((patient) => {
    const newPatient = {
      ...patient,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    setPatients((prev) => [...prev, newPatient]);
    return newPatient;
  }, []);

  const updatePatient = useCallback((id, updates) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  const deletePatient = useCallback((id) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPatientById = useCallback((id) => {
    return patients.find((p) => p.id === id);
  }, [patients]);

  const searchPatients = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    return patients.filter(
      (p) =>
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.email?.toLowerCase().includes(lowerQuery) ||
        p.phone?.includes(query) ||
        p.insuranceNumber?.includes(query)
    );
  }, [patients]);

  // Lab Request methods
  const addLabRequest = useCallback((request) => {
    const newRequest = {
      ...request,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    setLabRequests((prev) => [...prev, newRequest]);
    return newRequest;
  }, []);

  const updateLabRequest = useCallback((id, updates) => {
    setLabRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, ...updates, updatedAt: new Date().toISOString() } : req))
    );
  }, []);

  const deleteLabRequest = useCallback((id) => {
    setLabRequests((prev) => prev.filter((req) => req.id !== id));
  }, []);

  // Pharmacy Request methods
  const addPharmacyRequest = useCallback((request) => {
    const newRequest = {
      ...request,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    setPharmacyRequests((prev) => [...prev, newRequest]);
    return newRequest;
  }, []);

  const updatePharmacyRequest = useCallback((id, updates) => {
    setPharmacyRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, ...updates, updatedAt: new Date().toISOString() } : req))
    );
  }, []);

  const deletePharmacyRequest = useCallback((id) => {
    setPharmacyRequests((prev) => prev.filter((req) => req.id !== id));
  }, []);

  // Consultation methods
  const addConsultation = useCallback((consultation) => {
    const newConsultation = {
      ...consultation,
      id: Date.now(),
      startedAt: new Date().toISOString(),
      status: "in-progress",
    };
    setConsultations((prev) => [...prev, newConsultation]);
    return newConsultation;
  }, []);

  const updateConsultation = useCallback((id, updates) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  const completeConsultation = useCallback((id, finalData) => {
    setConsultations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...finalData, status: "completed", completedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  // Statistics
  const getStats = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      todayAppointments: appointments.filter((apt) => apt.appointmentDate === today).length,
      patientsWaiting: appointments.filter((apt) => apt.status === "pending" || apt.status === "confirmed").length,
      pendingLabRequests: labRequests.filter((req) => req.status === "pending").length,
      pendingPharmacyRequests: pharmacyRequests.filter((req) => req.status === "pending").length,
      totalPatients: patients.length,
      completedConsultations: consultations.filter((c) => c.status === "completed").length,
    };
  }, [appointments, labRequests, pharmacyRequests, patients, consultations]);

  // User Management Methods
  const addUser = useCallback((userData) => {
    // Check if username already exists
    if (users.some(u => u.username === userData.username)) {
      throw new Error("Username already exists");
    }

    const newUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, [users]);

  const deleteUser = useCallback((userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const validateUser = useCallback((username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      // Return user without password
      const { password, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }, [users]);

  const value = {
    // State
    appointments,
    patients,
    labRequests,
    pharmacyRequests,
    consultations,
    loading,
    // Appointment methods
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByDate,
    // Patient methods
    addPatient,
    updatePatient,
    deletePatient,
    getPatientById,
    searchPatients,
    // Lab Request methods
    addLabRequest,
    updateLabRequest,
    deleteLabRequest,
    // Pharmacy Request methods
    addPharmacyRequest,
    updatePharmacyRequest,
    deletePharmacyRequest,
    // Consultation methods
    addConsultation,
    updateConsultation,
    completeConsultation,
    // Statistics
    getStats,
    // User methods
    users,
    addUser,
    validateUser,
    deleteUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Default data generators
function getDefaultAppointments() {
  return [
    {
      id: 1,
      patientName: "John Smith",
      phone: "+1 (555) 123-4567",
      email: "john.smith@email.com",
      appointmentDate: new Date().toISOString().split("T")[0],
      appointmentTime: "9:00 AM",
      doctor: "Dr. Sarah Johnson",
      reason: "General Checkup",
      status: "confirmed",
      paymentStatus: "paid",
      amount: "150.00",
      patientId: 1,
      doctorId: 1,
    },
    {
      id: 2,
      patientName: "Emily Johnson",
      phone: "+1 (555) 234-5678",
      email: "emily.j@email.com",
      appointmentDate: new Date().toISOString().split("T")[0],
      appointmentTime: "10:30 AM",
      doctor: "Dr. Michael Chen",
      reason: "Follow-up",
      status: "pending",
      paymentStatus: "pending",
      amount: "200.00",
      patientId: 2,
      doctorId: 2,
    },
  ];
}

function getDefaultPatients() {
  return [
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
      waitingSince: null,
      doctorId: null,
      doctorName: null,
      reason: null,
      priority: null,
      status: null,
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
      waitingSince: null,
      doctorId: null,
      doctorName: null,
      reason: null,
      priority: null,
      status: null,
    },
  ];
}

