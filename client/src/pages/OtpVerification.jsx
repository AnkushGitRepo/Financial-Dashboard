import React, { useContext, useState } from "react";
import "../styles/OtpVerification.css";
import "../styles/Auth.css";
import axios from "axios";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Context } from "../main";

const OtpVerification = () => {
  const { isAuthenticated, setIsAuthenticated, setUser } = useContext(Context);
  const { email, phone } = useParams();
  const [otp, setOtp] = useState(["", "", "", "", ""]);

  

  

  

  const handleChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      document.getElementById(`otp-input-${index + 1}`).focus();
    } else if (index === otp.length - 1 && value) {
      // All digits entered, trigger verification
      handleOtpVerification();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      document.getElementById(`otp-input-${index - 1}`).focus();
    }
  };

  const handleOtpVerification = async () => {
    const enteredOtp = otp.join("");
    // Only proceed if all OTP fields are filled
    if (enteredOtp.length !== 5) {
      return;
    }

    const data = {
      email,
      otp: enteredOtp,
      phone,
    };
    await axios
      .post("http://localhost:4000/api/v1/user/otp-verification", data, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      })
      .then((res) => {
        toast.success(res.data.message);
        setIsAuthenticated(true);
        setUser(res.data.user);
      })
      .catch((err) => {
        toast.error(err.response.data.message);
        setIsAuthenticated(false);
        setUser(null);
      });
  };

  if (isAuthenticated) {
    return <Navigate to={"/"} />;
  }

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">OTP Verification</h2>
          <p className="otp-instruction">Enter the 5-digit OTP sent to your registered email or phone.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleOtpVerification(); }} className="auth-form">
            <div className="otp-input-container">
              {otp.map((digit, index) => {
                return (
                  <input
                    id={`otp-input-${index}`}
                    type="text"
                    maxLength="1"
                    key={index}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="otp-input"
                  />
                );
              })}
            </div>
            <button type="submit" className="auth-button">
              Verify OTP
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default OtpVerification;
