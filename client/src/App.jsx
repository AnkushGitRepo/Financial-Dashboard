import React, { useContext, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import StockDashboard from "./pages/StockDashboard";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OtpVerification from "./pages/OtpVerification";
import Stocks from "./pages/Stocks";
import Markets from "./pages/Markets";
import Currencies from "./pages/Currencies";
import Global from "./pages/Global";
import Portfolio from "./pages/Portfolio";
import Performance from "./pages/Performance";
import Analysis from "./pages/Analysis";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Layout from "./layout/Layout";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { Context } from "./main";
import PageTitle from "./components/PageTitle";

const App = () => {
  const { setIsAuthenticated, setUser } = useContext(Context);

  useEffect(() => {
    const getUser = async () => {
      await axios
        .get("http://localhost:4000/api/v1/user/me", { withCredentials: true })
        .then((res) => {
          setUser(res.data.user);
          setIsAuthenticated(true);
        })
        .catch((err) => {
          setUser(null);
          setIsAuthenticated(false);
        });
    };
    getUser();
  }, []);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/auth" element={<><PageTitle title="Authentication" /><Auth /></>} />
          <Route
            path="/otp-verification/:email/:phone"
            element={<><PageTitle title="OTP Verification" /><OtpVerification /></>}
          />
          <Route path="/password/forgot" element={<><PageTitle title="Forgot Password" /><ForgotPassword /></>} />
          <Route path="/password/reset/:token" element={<><PageTitle title="Reset Password" /><ResetPassword /></>} />
          <Route element={<Layout />}>
            <Route path="/" element={<><PageTitle title="Home" /><Home /></>} />
            <Route path="/stock-dashboard" element={<><PageTitle title="Stock Dashboard" /><StockDashboard /></>} />
            <Route path="/stocks" element={<><PageTitle title="Stocks" /><Stocks /></>} />
            <Route path="/markets" element={<><PageTitle title="Markets" /><Markets /></>} />
            <Route path="/currencies" element={<><PageTitle title="Currencies" /><Currencies /></>} />
            <Route path="/global" element={<><PageTitle title="Global" /><Global /></>} />
            <Route path="/portfolio" element={<><PageTitle title="Portfolio" /><Portfolio /></>} />
            <Route path="/performance" element={<><PageTitle title="Performance" /><Performance /></>} />
            <Route path="/analysis" element={<><PageTitle title="Analysis" /><Analysis /></>} />
            <Route path="/settings" element={<><PageTitle title="Settings" /><Settings /></>} />
            <Route path="*" element={<><PageTitle title="Page Not Found" /><NotFound /></>} />
          </Route>
        </Routes>
        <ToastContainer theme="colored" />
      </Router>
    </>
  );
};

export default App;
