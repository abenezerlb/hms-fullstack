

import React, { useState } from "react";
import { validatePaymentForm } from "@/utils/validation";
import { useToast } from "@/hooks/useToast";
import { getRegistrationPrice } from "@/utils/pricing";

const PaymentPage = ({ appointment, onPaymentComplete, onCancel }) => {
  const toast = useToast();
  const [paymentMethod, setPaymentMethod] = useState("telebirr");
  const [telebirrPhone, setTelebirrPhone] = useState("");
  const [telebirrPin, setTelebirrPin] = useState("");
  const [amount, setAmount] = useState(appointment?.amount || getRegistrationPrice().toString());
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!telebirrPhone.trim()) {
      setErrors({ telebirrPhone: "Telebirr phone number is required" });
      toast.error("Please enter your Telebirr phone number");
      return;
    }
    if (!/^09\d{8}$/.test(telebirrPhone.replace(/\s/g, ""))) {
      setErrors({ telebirrPhone: "Invalid Telebirr phone number. Format: 09XXXXXXXX" });
      toast.error("Invalid Telebirr phone number");
      return;
    }
    if (!telebirrPin.trim()) {
      setErrors({ telebirrPin: "Telebirr PIN is required" });
      toast.error("Please enter your Telebirr PIN");
      return;
    }
    if (telebirrPin.length < 4) {
      setErrors({ telebirrPin: "PIN must be at least 4 digits" });
      toast.error("Invalid PIN");
      return;
    }

    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error("Please fix the errors in the form");
      return;
    }

    setErrors({});
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      setPaymentSuccess(true);
      toast.success("Payment processed successfully!");
      setTimeout(() => {
        onPaymentComplete?.({
          ...appointment,
          paymentStatus: "paid",
          paymentMethod,
          amount,
          paidAt: new Date().toISOString(),
        });
      }, 2000);
    }, 2000);
  };

  if (paymentSuccess) {
    return (
      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", margin: "0 auto 24px", background: "#f4f4f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px", color: "var(--med-text-primary)" }}>Payment Successful!</h2>
        <p style={{ color: "var(--med-text-secondary)", marginBottom: "32px" }}>Your payment has been processed successfully.</p>
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "var(--med-text-secondary)" }}>Amount Paid:</span>
            <span style={{ fontWeight: "700", fontSize: "18px", color: "var(--med-text-primary)" }}>{amount} ETB</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "var(--med-text-secondary)" }}>Payment Method:</span>
            <span style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>Telebirr</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "var(--med-text-secondary)" }}>Phone Number:</span>
            <span style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>{telebirrPhone}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--med-text-secondary)" }}>Transaction ID:</span>
            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--med-text-secondary)" }}>TXN-{Date.now().toString().slice(-8)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "var(--med-text-primary)" }}>
          Process Payment
        </h1>
        <p style={{ color: "var(--med-text-secondary)", fontSize: "14px" }}>
          Complete payment for appointment
        </p>
      </div>

      {appointment && (
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--med-text-primary)" }}>Appointment Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
            <div>
              <div style={{ color: "var(--med-text-secondary)", marginBottom: "4px" }}>Patient</div>
              <div style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>{appointment.patientName}</div>
            </div>
            <div>
              <div style={{ color: "var(--med-text-secondary)", marginBottom: "4px" }}>Date & Time</div>
              <div style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>{appointment.appointmentDate} {appointment.appointmentTime}</div>
            </div>
            <div>
              <div style={{ color: "var(--med-text-secondary)", marginBottom: "4px" }}>Doctor</div>
              <div style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>{appointment.doctor}</div>
            </div>
            <div>
              <div style={{ color: "var(--med-text-secondary)", marginBottom: "4px" }}>Reason</div>
              <div style={{ fontWeight: "600", color: "var(--med-text-primary)" }}>{appointment.reason}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--med-text-primary)" }}>
            Payment Amount
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", fontWeight: "600", color: "var(--med-text-secondary)" }}>ETB</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px 12px 50px",
                border: "1px solid var(--med-border)",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: "600",
              }}
              required
            />
          </div>
        </div>

        {/* Telebirr Payment Section */}
        <div style={{ marginBottom: "24px", padding: "20px", background: "#18181b", borderRadius: "12px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", opacity: 0.8 }}>Total Amount Due</span>
            <div style={{ width: "40px", height: "40px", background: "white", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "700", color: "#000000" }}>
              T
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Telebirr Payment</h3>
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>Mobile Money Payment</p>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "white" }}>
              Telebirr Phone Number
            </label>
            <input
              type="text"
              value={telebirrPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setTelebirrPhone(value);
                if (errors.telebirrPhone) setErrors({ ...errors, telebirrPhone: null });
              }}
              placeholder="09XXXXXXXX"
              maxLength={10}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `2px solid ${errors.telebirrPhone ? "#ef4444" : "rgba(255,255,255,0.3)"}`,
                borderRadius: "8px",
                fontSize: "16px",
                background: "rgba(255,255,255,0.1)",
                color: "white",
              }}
              required
            />
            {errors.telebirrPhone && (
              <div style={{ color: "#000000", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>{errors.telebirrPhone}</div>
            )}
            <p style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>Enter your Telebirr registered phone number (09XXXXXXXX)</p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "white" }}>
              Telebirr PIN
            </label>
            <input
              type="password"
              value={telebirrPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTelebirrPin(value);
                if (errors.telebirrPin) setErrors({ ...errors, telebirrPin: null });
              }}
              placeholder="Enter your PIN"
              maxLength={6}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: `2px solid ${errors.telebirrPin ? "#ef4444" : "rgba(255,255,255,0.3)"}`,
                borderRadius: "8px",
                fontSize: "16px",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                letterSpacing: "4px",
              }}
              required
            />
            {errors.telebirrPin && (
              <div style={{ color: "#000000", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>{errors.telebirrPin}</div>
            )}
            <p style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>Enter your Telebirr PIN to authorize payment</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: "1",
              padding: "14px",
              border: "1px solid var(--med-border)",
              borderRadius: "8px",
              background: "white",
              color: "var(--med-text-primary)",
              fontWeight: "600",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={processing}
            style={{
              flex: "2",
              padding: "14px",
              border: "none",
              borderRadius: "8px",
              background: processing ? "#52525b" : "#000000",
              color: "white",
              fontWeight: "600",
              fontSize: "16px",
              cursor: processing ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {processing ? "Processing..." : `Pay ${amount} ETB`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentPage;

