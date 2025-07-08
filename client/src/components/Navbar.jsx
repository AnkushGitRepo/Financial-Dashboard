import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import '../styles/Navbar.css';

export function Navbar() {
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
          <button className="navbar-button">
            <Bell className="navbar-bell-icon" />
            <span className="navbar-notification-dot" />
          </button>

          <div className="navbar-avatar">
            <div className="navbar-avatar-fallback">
              <User className="navbar-user-icon" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}