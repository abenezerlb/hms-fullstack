

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";


// Icon Components (must be defined before use)
const MedicalCrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
    <path d="M9 2h6v6h6v6h-6v6H9v-6H3V8h6z" />
  </svg>
);





const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LoginPage = ({ onLogin }) => {
  const { validateUser } = useApp(); // Use context for validation
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate a small network delay for better UX
    setTimeout(() => {
      const user = validateUser(username, password);

      if (user) {
        onLogin(user);
      } else {
        setError("Invalid username or password");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="login-page">
      
      
        



    
      
      <div className="login-left">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#063d4b",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <MedicalCrossIcon />
            </div>
            <span style={{ fontSize: "24px", fontWeight: "600", color: "#000000" }}>MedSchedule</span>
          </div>

          <h1>Healthcare Management Made Simple</h1>
          <p style={{color:'white'}}>
            Streamline your clinic operations with our comprehensive scheduling
            and patient management system. Designed for modern healthcare facilities.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <CheckCircleIcon />
              <span>Real-time appointment scheduling</span>
            </div>
            <div className="login-feature">
              <CheckCircleIcon />
              <span>Complete patient records management</span>
            </div>
            <div className="login-feature">
              <CheckCircleIcon />
              <span>Multi-department coordination</span>
            </div>
            <div className="login-feature">
              <CheckCircleIcon />
              <span>Secure and HIPAA compliant</span>
            </div>
          </div>
        </div>
      </div>
       
      <div className="login-right">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to access your dashboard</p>

          {error && (
            <div style={{
              padding: "12px 16px",
              backgroundColor: "#f4f4f5",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              marginBottom: "20px",
              color: "#000000",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autocomplete="off"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autocomplete="off"
                  disabled={loading}
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "var(--med-text-secondary)"
                  }}
                  disabled={loading}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              fontSize: "13px"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" style={{ width: "16px", height: "16px" }} />
                <span style={{ color: "var(--med-text-secondary)" }}>Remember me</span>
              </label>
              <a href="#" style={{ color: "var(--med-text-primary)", textDecoration: "underline" }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="form-footer">
            Need help? <a href="#">Contact IT Support</a>
          </div>
        </div>
      </div> 
    </div>
  );
};

export default LoginPage;
