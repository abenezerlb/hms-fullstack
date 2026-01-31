import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import "@/styles/medical-scheduler.css"; // Ensure this file exists or is handled
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { getRegistrationPrice } from "@/utils/pricing";

// Component Imports
import Sidebar from "@/components/medical/Sidebar";
import ScheduleCalendar from "@/components/medical/ScheduleCalendar";
import PatientRegistrationModal from "@/components/medical/PatientRegistrationModal";
import LoginPage from "@/components/medical/LoginPage";
import DoctorPage from "@/components/medical/DoctorPage";
import LabTechPage from "@/components/medical/LabTechPage";
import PharmacyPage from "@/components/medical/PharmacyPage";
import ReceptionistPage from "@/components/medical/ReceptionistPage";
import PaymentPage from "@/components/medical/PaymentPage";
import PatientWaitlistPage from "@/components/medical/PatientWaitlistPage";
import AdminPage from "@/components/medical/AdminPage";

// Icons
const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const UsersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const LabIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <path d="M9 3h6v2H9z" />
        <path d="M10 5v6l-4 8h12l-4-8V5" />
    </svg>
);

const PharmacyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

function App() {
    const [user, setUser] = useState(() => {
        // Load user from localStorage if available
        try {
            const savedUser = localStorage.getItem("medschedule_user");
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });
    const [activeNav, setActiveNav] = useState("dashboard");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [selectedPaymentAppointment, setSelectedPaymentAppointment] = useState(null);
    const [showPaymentPage, setShowPaymentPage] = useState(false);

    // Use AppContext for shared state
    const {
        labRequests,
        pharmacyRequests,
        addLabRequest,
        updateLabRequest,
        addPharmacyRequest,
        updatePharmacyRequest,
        updateAppointment,
        addPatient,
        addAppointment,
        doctors,
        updatePatient,
    } = useApp();
    const toast = useToast();

    const navigate = useNavigate();
    const location = useLocation();

    // Redirect to login if not authenticated and not already on login page
    useEffect(() => {
        if (!user && location.pathname !== '/login') {
            navigate('/login', { replace: true });
        }
    }, [user, location.pathname, navigate]);

    const handleLogin = (userData) => {
        setUser(userData);
        // Save user to localStorage
        localStorage.setItem("medschedule_user", JSON.stringify(userData));
        toast.success(`Welcome back, ${userData.name || userData.email}!`);

        // Set default navigation based on role
        if (userData.role === "Admin") {
            setActiveNav("admin");
            navigate("/admin");
        } else if (userData.role === "Doctor") {
            setActiveNav("doctor");
            navigate("/doctor");
        } else if (userData.role === "Lab Technician") {
            setActiveNav("lab");
            navigate("/lab");
        } else if (userData.role === "Pharmacist") {
            setActiveNav("pharmacy");
            navigate("/pharmacy");
        } else if (userData.role === "Receptionist") {
            setActiveNav("receptionist");
            navigate("/receptionist");
        } else {
            setActiveNav("schedule");
            navigate("/");
        }
    };

    // ... [existing code]

    // Role-based route protection


    // ... [existing code]



    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("medschedule_user");
        setActiveNav("dashboard");
        toast.info("You have been logged out");
        navigate("/login");
    };

    const handleCellClick = (appointmentInfo) => {
        setSelectedAppointment(appointmentInfo);
        setIsModalOpen(true);
    };

    const handlePatientSubmit = (patientData) => {
        // Get selected doctor from patientData or appointmentInfo
        const selectedDoctor = patientData.doctor || selectedAppointment?.doctor;
        const appointmentDate = patientData.date || selectedAppointment?.date;

        // Add patient to context
        const newPatient = {
            name: `${patientData.firstName} ${patientData.lastName}`,
            age: patientData.dateOfBirth ? Math.floor((new Date() - new Date(patientData.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            gender: patientData.gender,
            phone: patientData.phone,
            email: patientData.email,
            address: patientData.address,
            insuranceProvider: patientData.insuranceProvider,
            insuranceNumber: patientData.insuranceNumber,
            emergencyContact: patientData.emergencyContact,
            emergencyPhone: patientData.emergencyPhone,
            dateOfBirth: patientData.dateOfBirth,
            waitingSince: null,
            doctorId: selectedDoctor?.id || null,
            doctorName: selectedDoctor?.name || null,
            reason: patientData.symptoms || patientData.reason || "Appointment",
            priority: null,
            status: null,
        };
        const savedPatient = addPatient(newPatient);

        // Create appointment if doctor and date are provided
        if (selectedDoctor && appointmentDate) {
            const appointmentDateStr = appointmentDate instanceof Date
                ? appointmentDate.toISOString().split("T")[0]
                : appointmentDate;

            const appointment = {
                patientId: savedPatient.id,
                patientName: savedPatient.name,
                phone: savedPatient.phone,
                email: savedPatient.email,
                appointmentDate: appointmentDateStr,
                appointmentTime: patientData.appointmentTime || "9:00 AM",
                doctor: selectedDoctor.name,
                doctorId: selectedDoctor.id,
                reason: patientData.symptoms || patientData.reason || "General Consultation",
                status: "confirmed",
                paymentStatus: "pending",
                amount: patientData.amount || patientData.registrationFee || getRegistrationPrice(),
                currency: patientData.currency || "ETB",
                type: patientData.appointmentType || "consultation",
                notes: patientData.notes || "",
            };
            addAppointment(appointment);
            toast.success(`Appointment created for ${savedPatient.name} with ${selectedDoctor.name}`);
        }

        console.log("Patient registered:", patientData);
        toast.success("Patient registered successfully!");
        setIsModalOpen(false);
        setSelectedAppointment(null);
    };

    // Handle lab requests from doctor
    const handleSendToLab = (request) => {
        addLabRequest(request);
        toast.success(`Lab request sent for ${request.patientName}`);
    };

    // Handle pharmacy requests from doctor
    const handleSendToPharmacy = (request) => {
        addPharmacyRequest(request);
        toast.success(`Prescription sent to pharmacy for ${request.patientName}`);
    };

    // Update lab request status
    const handleUpdateLabRequest = (updatedRequest) => {
        updateLabRequest(updatedRequest.id, updatedRequest);
        if (updatedRequest.status === "completed") {
            toast.success(`Lab results completed for ${updatedRequest.patientName}`);
        }
    };

    // Update pharmacy request status
    const handleUpdatePharmacyRequest = (updatedRequest) => {
        updatePharmacyRequest(updatedRequest.id, updatedRequest);
        if (updatedRequest.status === "dispensed") {
            toast.success(`Prescription dispensed for ${updatedRequest.patientName}`);
        }
    };

    // Role-based route protection
    const RoleProtectedRoute = ({ children, allowedRoles }) => {
        if (!user) {
            return <Navigate to="/login" replace />;
        }
        if (!allowedRoles.includes(user.role)) {
            // Redirect to their role-specific page
            if (user.role === "Doctor") {
                return <Navigate to="/doctor" replace />;
            } else if (user.role === "Lab Technician") {
                return <Navigate to="/lab" replace />;
            } else if (user.role === "Pharmacist") {
                return <Navigate to="/pharmacy" replace />;
            } else if (user.role === "Receptionist") {
                return <Navigate to="/receptionist" replace />;
            }
            return <Navigate to="/login" replace />;
        }
        return children;
    };

    // Layout component for authenticated routes
    const AuthenticatedLayout = ({ children }) => {
        if (!user) {
            return <Navigate to="/login" replace />;
        }

        return (
            <div className="app-layout">
                <Sidebar
                    activeItem={activeNav}
                    onNavigate={(nav) => {
                        setActiveNav(nav);
                        if (nav === 'schedule' || nav === 'dashboard') navigate('/');
                        else if (nav === 'waitlist') navigate('/waitlist');
                        else navigate(`/${nav}`);
                    }}
                    user={user}
                    onLogout={handleLogout}
                />
                <main className="main-content">
                    {children}
                </main>
            </div>
        );
    };

    const handlePaymentClick = (appointment) => {
        setSelectedPaymentAppointment(appointment);
        setShowPaymentPage(true);
    };

    const handlePaymentComplete = (updatedAppointment) => {
        if (updatedAppointment.id) {
            updateAppointment(updatedAppointment.id, {
                paymentStatus: "paid",
                paymentMethod: updatedAppointment.paymentMethod,
                paidAt: updatedAppointment.paidAt,
            });
        }
        setShowPaymentPage(false);
        setSelectedPaymentAppointment(null);
        toast.success(`Payment of $${updatedAppointment.amount} processed successfully!`);
    };

    return (
        <div className="medical-app">
            <Routes>
                <Route path="/login" element={
                    user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
                } />

                <Route path="/" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Receptionist"]}>
                            <>
                                <div className="page-header">
                                    <h1>Schedule Management</h1>
                                    <p>View and manage appointments for all doctors</p>
                                </div>

                                {/* Stats Cards */}
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-card-header">
                                            <span>Today's Appointments</span>
                                            <CalendarIcon />
                                        </div>
                                        <div className="stat-value">24</div>
                                        <div className="stat-change">+3 from yesterday</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-card-header">
                                            <span>Patients Waiting</span>
                                            <UsersIcon />
                                        </div>
                                        <div className="stat-value">8</div>
                                        <div className="stat-change">2 urgent cases</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-card-header">
                                            <span>Lab Requests</span>
                                            <LabIcon />
                                        </div>
                                        <div className="stat-value">{labRequests.length}</div>
                                        <div className="stat-change">{labRequests.filter(r => r.status === "pending").length} pending</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-card-header">
                                            <span>Pharmacy Orders</span>
                                            <PharmacyIcon />
                                        </div>
                                        <div className="stat-value">{pharmacyRequests.length}</div>
                                        <div className="stat-change">{pharmacyRequests.filter(r => r.status === "pending").length} pending</div>
                                    </div>
                                </div>

                                {/* Schedule Calendar */}
                                <ScheduleCalendar onCellClick={handleCellClick} />
                            </>
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                <Route path="/doctor" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Doctor"]}>
                            <DoctorPage
                                doctor={{
                                    id: 1, // Doctor ID for matching waitlist patients
                                    name: user?.name,
                                    specialty: "General Medicine",
                                    email: user?.email,
                                    phone: user?.phone || "N/A",
                                    licenseNo: "MD-2023-45678",
                                    experience: user?.yearsExperience ? `${user.yearsExperience} years` : "N/A",
                                    education: user?.university || "N/A",
                                    avatar: user?.name?.split(" ").map((n) => n[0]).join("") || "",
                                }}
                                onSendToLab={handleSendToLab}
                                onSendToPharmacy={handleSendToPharmacy}
                            />
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                <Route path="/lab" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Lab Technician"]}>
                            <LabTechPage
                                user={user}
                                labRequests={labRequests}
                                onUpdateRequest={handleUpdateLabRequest}
                            />
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                <Route path="/pharmacy" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Pharmacist"]}>
                            <PharmacyPage
                                user={user}
                                pharmacyRequests={pharmacyRequests}
                                onUpdateRequest={handleUpdatePharmacyRequest}
                            />
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                <Route path="/receptionist" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Receptionist"]}>
                            {showPaymentPage ? (
                                <PaymentPage
                                    appointment={selectedPaymentAppointment}
                                    onPaymentComplete={handlePaymentComplete}
                                    onCancel={() => {
                                        setShowPaymentPage(false);
                                        setSelectedPaymentAppointment(null);
                                    }}
                                />
                            ) : (
                                <ReceptionistPage
                                    onPatientClick={(apt) => {
                                        setSelectedAppointment(apt);
                                        setIsModalOpen(true);
                                    }}
                                    onPaymentClick={handlePaymentClick}
                                />
                            )}
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                <Route path="/admin" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Admin"]}>
                            <AdminPage />
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                <Route path="/waitlist" element={
                    <AuthenticatedLayout>
                        <RoleProtectedRoute allowedRoles={["Receptionist"]}>
                            <PatientWaitlistPage />
                        </RoleProtectedRoute>
                    </AuthenticatedLayout>
                } />

                {/* Catch all redirect */}
                <Route path="*" element={
                    user ? (
                        user.role === "Doctor" ? <Navigate to="/doctor" replace /> :
                            user.role === "Lab Technician" ? <Navigate to="/lab" replace /> :
                                user.role === "Pharmacist" ? <Navigate to="/pharmacy" replace /> :
                                    user.role === "Receptionist" ? <Navigate to="/receptionist" replace /> :
                                        <Navigate to="/" replace />
                    ) : <Navigate to="/login" replace />
                } />
            </Routes>

            {/* Patient Registration Modal */}
            {user && (
                <PatientRegistrationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    appointmentInfo={selectedAppointment}
                    onSubmit={handlePatientSubmit}
                />
            )}
        </div>
    );
}

export default App;
