import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";

const AdminPage = () => {
    const { users, addUser, deleteUser } = useApp();
    const toast = useToast();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Doctor"); // Default role
    const [yearsExperience, setYearsExperience] = useState("");
    const [phone, setPhone] = useState("");
    const [university, setUniversity] = useState("");
    const [generatedCreds, setGeneratedCreds] = useState(null);

    const roles = ["Doctor", "Receptionist", "Lab Technician", "Pharmacist", "Admin"];

    // Check if current role needs professional fields
    const needsProfessionalFields = role !== "Receptionist";

    const handleCreateUser = (e) => {
        e.preventDefault();

        if (!username.trim()) {
            toast.error("Username is required");
            return;
        }

        if (!password.trim()) {
            toast.error("Password is required");
            return;
        }

        try {
            const userData = {
                name,
                username,
                password,
                role
            };

            // Add professional fields for non-receptionist roles
            if (needsProfessionalFields) {
                userData.yearsExperience = yearsExperience;
                userData.phone = phone;
                userData.university = university;
            }

            const newUser = addUser(userData);

            setGeneratedCreds({ username, password });
            toast.success(`User ${name} created successfully!`);
            setName("");
            setUsername("");
            setPassword("");
            setYearsExperience("");
            setPhone("");
            setUniversity("");
            setRole("Doctor");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDeleteUser = (id, username) => {
        if (username === "admin") {
            toast.error("Cannot delete the default admin account.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
            deleteUser(id);
            toast.success("User deleted.");
        }
    };

    return (
        <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#fafafa" }}>
            <div className="page-header" style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#000000", margin: "0 0 8px 0" }}>Admin Dashboard</h1>
                <p style={{ color: "#71717a", fontSize: "14px", margin: "0" }}>Manage system users and access</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                {/* Create User Form */}
                <div style={{ padding: "24px", background: "#ffffff", borderRadius: "12px", border: "2px solid #e4e4e7", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#000000" }}>Create New User</h2>
                    <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "14px" }}
                                placeholder="e.g. Dr. Sarah Smith"
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "14px" }}
                                placeholder="e.g. ssarah or jdoe"
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>Password</label>
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "14px" }}
                                placeholder="Enter temporary password"
                                required
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", background: "white", fontSize: "14px" }}
                            >
                                {roles.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {/* Professional fields - only for non-receptionist roles */}
                        {needsProfessionalFields && (
                            <>
                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>Years of Experience</label>
                                    <input
                                        type="number"
                                        value={yearsExperience}
                                        onChange={(e) => setYearsExperience(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "14px" }}
                                        placeholder="e.g. 5"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "14px" }}
                                        placeholder="e.g. +251 911 234 567"
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px", color: "#000000" }}>University/Medical School</label>
                                    <input
                                        type="text"
                                        value={university}
                                        onChange={(e) => setUniversity(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: "6px", fontSize: "14px" }}
                                        placeholder="e.g. Addis Ababa University"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            style={{
                                width: "100%",
                                background: "#000000",
                                color: "white",
                                padding: "10px",
                                borderRadius: "6px",
                                fontWeight: "600",
                                cursor: "pointer",
                                border: "none",
                                fontSize: "14px"
                            }}
                        >
                            Create Account
                        </button>
                    </form>

                    {generatedCreds && (
                        <div style={{ marginTop: "24px", padding: "16px", background: "#f4f4f5", borderRadius: "8px", border: "1px solid #e4e4e7" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", color: "#000000" }}>Account Created!</h3>
                            <p style={{ fontSize: "12px", color: "#71717a", margin: "0 0 8px 0" }}>Please save these credentials:</p>
                            <div style={{ marginTop: "8px", padding: "8px", borderLeft: "2px solid black", fontFamily: "monospace", fontSize: "13px", background: "white" }}>
                                <p style={{ margin: "4px 0" }}>Username: <strong>{generatedCreds.username}</strong></p>
                                <p style={{ margin: "4px 0" }}>Password: <strong>{generatedCreds.password}</strong></p>
                            </div>
                            <button
                                onClick={() => setGeneratedCreds(null)}
                                style={{ marginTop: "12px", fontSize: "11px", color: "#71717a", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                </div>

                {/* User List */}
                <div style={{ padding: "24px", background: "#ffffff", borderRadius: "12px", border: "2px solid #e4e4e7", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#000000" }}>Existing Users ({users.length})</h2>
                    <div style={{ overflowY: "auto", maxHeight: "500px" }}>
                        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f4f4f5", borderBottom: "2px solid #e4e4e7" }}>
                                    <th style={{ padding: "8px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#71717a" }}>Name</th>
                                    <th style={{ padding: "8px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#71717a" }}>Role</th>
                                    <th style={{ padding: "8px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#71717a" }}>Username</th>
                                    <th style={{ padding: "8px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#71717a" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} style={{ borderBottom: "1px solid #e4e4e7" }}>
                                        <td style={{ padding: "8px", fontSize: "14px", color: "#000000" }}>{user.name}</td>
                                        <td style={{ padding: "8px" }}>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                                fontSize: "10px",
                                                fontWeight: "700",
                                                background: user.role === 'Admin' ? '#000000' : '#f4f4f5',
                                                color: user.role === 'Admin' ? '#ffffff' : '#000000',
                                                border: "1px solid #000000",
                                                textTransform: "uppercase"
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: "8px", fontSize: "12px", fontFamily: "monospace", color: "#71717a" }}>{user.username}</td>
                                        <td style={{ padding: "8px" }}>
                                            {user.username !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                    style={{ fontSize: "12px", color: "#71717a", cursor: "pointer", background: "none", border: "none", textDecoration: "underline" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = "#000000"}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: "16px", textAlign: "center", color: "#71717a" }}>No users found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
