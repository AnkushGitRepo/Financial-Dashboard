import React from 'react';
import { PageLayout } from '../layout/PageLayout';
import { Bell, Globe, Lock, User, Settings as SettingsIcon } from 'lucide-react';
import '../styles/Settings.css';

const Settings = () => {
  return (
    <PageLayout title="Settings">
      <div className="settings-grid">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <div className="settings-card">
            <h2 className="settings-sidebar-title">Settings</h2>
            <nav className="settings-nav-list">
              <button className="settings-nav-button">
                <User className="settings-nav-icon" />
                Account
              </button>
              <button className="settings-nav-button">
                <Bell className="settings-nav-icon" />
                Notifications
              </button>
              <button className="settings-nav-button">
                <Lock className="settings-nav-icon" />
                Security
              </button>
              <button className="settings-nav-button">
                <Globe className="settings-nav-icon" />
                Regional Settings
              </button>
              <button className="settings-nav-button">
                <SettingsIcon className="settings-nav-icon" />
                Preferences
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="settings-main-content">
          <div className="settings-card">
            <h2 className="settings-main-title">Account Settings</h2>

            <div className="settings-section-space">
              {/* Personal Information Section */}
              <div>
                <h3 className="settings-section-subtitle">Personal Information</h3>
                <div className="settings-form-grid">
                  <div>
                    <label className="settings-label">First Name</label>
                    <input 
                      type="text" 
                      defaultValue="John"
                      className="settings-input" 
                    />
                  </div>
                  <div>
                    <label className="settings-label">Last Name</label>
                    <input 
                      type="text" 
                      defaultValue="Smith"
                      className="settings-input" 
                    />
                  </div>
                  <div>
                    <label className="settings-label">Email</label>
                    <input 
                      type="email" 
                      defaultValue="john.smith@example.com"
                      className="settings-input" 
                    />
                  </div>
                  <div>
                    <label className="settings-label">Phone</label>
                    <input 
                      type="text" 
                      defaultValue="+1 (555) 123-4567"
                      className="settings-input" 
                    />
                  </div>
                </div>
              </div>

              {/* Display Settings Section */}
              <div>
                <h3 className="settings-section-subtitle">Display Settings</h3>
                <div className="settings-display-space">
                  <div className="settings-display-item">
                    <div>
                      <p className="settings-display-text-bold">Dark Mode</p>
                      <p className="settings-display-text-muted">Switch between light and dark theme</p>
                    </div>
                    <label className="settings-toggle-switch">
                      <input type="checkbox" className="settings-toggle-input" />
                      <div className="settings-toggle-slider"></div>
                    </label>
                  </div>

                  <div className="settings-display-item">
                    <div>
                      <p className="settings-display-text-bold">Compact View</p>
                      <p className="settings-display-text-muted">Show more data with less spacing</p>
                    </div>
                    <label className="settings-toggle-switch">
                      <input type="checkbox" className="settings-toggle-input" defaultChecked />
                      <div className="settings-toggle-slider"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="settings-actions-top-border">
                <button className="settings-save-button">Save Changes</button>
                <button className="settings-cancel-button">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;