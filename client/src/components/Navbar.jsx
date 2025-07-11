import React, { useContext, useState, useRef, useEffect } from 'react';
import { Search, Bell, User, Settings, LogIn, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { Context } from '../main';
import axios from 'axios';
import { toast } from 'react-toastify';

export function Navbar() {
  const { user, isAuthenticated, setIsAuthenticated, setUser } = useContext(Context);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  };

  const handleLogout = async () => {
    await axios
      .get("http://localhost:4000/api/v1/user/logout", { withCredentials: true })
      .then((res) => {
        toast.success(res.data.message);
        setIsAuthenticated(false);
        setUser(null);
        navigate("/auth");
      })
      .catch((error) => {
        toast.error(error.response.data.message);
        setIsAuthenticated(true);
        setUser(true);
      });
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <h1 className="navbar-title">MarketMitra</h1>
          <div className="navbar-search">
            <Search className="navbar-search-icon" />
            <input 
              type="search" 
              placeholder="Search stocks, indices..." 
              className="navbar-search-input"
            />
          </div>
        </div>

        <div className="navbar-right">
          

          <div className="navbar-profile-dropdown" ref={dropdownRef}>
            <div className="navbar-avatar" onClick={toggleDropdown}>
              {user && user.avatar && user.avatar.url ? (
                <img src={user.avatar.url} alt="User Avatar" className="navbar-avatar-image" />
              ) : (
                <div className="navbar-avatar-fallback">
                  <User className="navbar-user-icon" />
                </div>
              )}
            </div>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                {!isAuthenticated ? (
                  <Link to="/auth" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    <LogIn className="dropdown-icon" />
                    Sign In
                  </Link>
                ) : (
                  <>
                    <Link to="/settings" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <Settings className="dropdown-icon" />
                      Settings
                    </Link>
                    <button onClick={() => { handleLogout(); setIsDropdownOpen(false); }} className="dropdown-item">
                      <LogOut className="dropdown-icon" />
                      Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
