import React, { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Link, useNavigate } from "react-router-dom";
import { AtSign, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import '../styles/Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthenticated, setUser } = useContext(Context);
  const navigateTo = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleAuth = async (data) => {
    const url = isLogin 
      ? "http://localhost:4000/api/v1/user/login" 
      : "http://localhost:4000/api/v1/user/register";

    try {
      const payload = isLogin ? data : { ...data, verificationMethod: "email" };
      const res = await axios.post(url, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      
      toast.success(res.data.message);
      if (!isLogin) {
        navigateTo(`/otp-verification/${data.email}/${data.phone}`);
      } else {
        setIsAuthenticated(true);
        setUser(res.data.user);
        navigateTo("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{isLogin ? 'Sign In' : 'Sign Up'}</h2>
        
        <form onSubmit={handleSubmit(handleAuth)} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <User className="input-icon" />
              <input type="text" placeholder="Name" {...register("name", { required: true })} />
            </div>
          )}
          
          <div className="input-group">
            <AtSign className="input-icon" />
            <input type="email" placeholder="Enter your Email" {...register("email", { required: true })} />
          </div>

          {!isLogin && (
            <div className="input-group">
              <Phone className="input-icon" />
              <input type="tel" placeholder="Phone Number" {...register("phone", { required: true })} />
            </div>
          )}
          
          <div className="input-group">
            <Lock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your Password"
              {...register("password", { required: true })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle-button"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {isLogin && (
            <div className="auth-options">
              <label className="remember-me">
                <input type="checkbox" {...register("rememberMe")} />
                Remember me
              </label>
              <Link to="/password/forgot" className="forgot-password-link">Forgot password?</Link>
            </div>
          )}
          
          <button type="submit" className="auth-button">{isLogin ? 'Sign In' : 'Sign Up'}</button>
        </form>

        <div className="switch-auth">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setIsLogin(!isLogin)} className="switch-auth-button">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <div className="social-auth-divider">Or With</div>

        <div className="social-auth-buttons">
          <button className="social-button google">
            <img src="https://img.icons8.com/color/16/000000/google-logo.png" alt="Google" /> Google
          </button>
          <button className="social-button apple">
            <img src="https://img.icons8.com/ios-filled/16/000000/mac-os.png" alt="Apple" /> Apple
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
