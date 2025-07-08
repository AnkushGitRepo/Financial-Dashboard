import React, { useState, useRef } from 'react';
import { PageLayout } from '../layout/PageLayout';
import { Bell, Globe, Lock, User, Settings as SettingsIcon } from 'lucide-react';
import '../styles/Settings.css';

const Settings = () => {
  const fileInputRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [dob, setDob] = useState('');
  const [incomeLevel, setIncomeLevel] = useState('');
  const [aadhaarPan, setAadhaarPan] = useState('');
  const [occupation, setOccupation] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const incomeLevels = [
    { value: '', label: 'Select Income Level' },
    { value: '<100000', label: '< ₹1,00,000' },
    { value: '100000-300000', label: '₹1,00,000 - ₹3,00,000' },
    { value: '300000-500000', label: '₹3,00,000 - ₹5,00,000' },
    { value: '500000-1000000', label: '₹5,00,000 - ₹10,00,000' },
    { value: '1000000-2500000', label: '₹10,00,000 - ₹25,00,000' },
    { value: '2500000-5000000', label: '₹25,00,000 - ₹50,00,000' },
    { value: '>5000000', label: '> ₹50,00,000' },
  ];

  const occupations = [
    { value: '', label: 'Select Occupation' },
    { value: 'student', label: 'Student' },
    { value: 'salaried', label: 'Salaried' },
    { value: 'self-employed', label: 'Self-Employed' },
    { value: 'business', label: 'Business' },
    { value: 'retired', label: 'Retired' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProfilePhoto(null);
      setProfilePhotoPreview('');
    }
  };

  const handleSaveChanges = () => {
    // This is where you would send data to your backend
    console.log('Saving changes...', {
      profilePhoto,
      fullName,
      email,
      phoneNumber,
      address,
      pincode,
      city,
      area,
      dob,
      incomeLevel,
      aadhaarPan,
      occupation,
      darkMode,
      compactView,
    });
    // In a real application, you'd make an API call here
  };

  const handleCancel = () => {
    // Revert to initial state or fetched data
    console.log('Cancelling changes.');
    // In a real application, you'd re-fetch data or reset form
  };

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
              {/* Profile Photo Upload and Preview */}
              <div className="profile-photo-section">
                <label className="settings-label">Profile Photo</label>
                <div className="profile-photo-wrapper">
                  <div className="profile-photo-preview" onClick={() => fileInputRef.current.click()}>
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="Profile Preview" className="profile-photo-img" />
                    ) : (
                      <User className="profile-photo-placeholder-icon" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="settings-input-file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Personal Information Section */}
              <div>
                <h3 className="settings-section-subtitle">Personal Information</h3>
                <div className="settings-form-grid">
                  <div>
                    <label className="settings-label">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="settings-label">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your email"
                      disabled // Email usually not editable directly
                    />
                  </div>
                  <div>
                    <label className="settings-label">Phone Number</label>
                    <input 
                      type="text" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="settings-label">Occupation</label>
                    <select 
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="settings-input" 
                    >
                      {occupations.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="settings-label">Address</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your address"
                    />
                  </div>
                  <div>
                    <label className="settings-label">Pincode</label>
                    <input 
                      type="text" 
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your pincode"
                    />
                  </div>
                  <div>
                    <label className="settings-label">City</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your city"
                    />
                  </div>
                  <div>
                    <label className="settings-label">Area</label>
                    <input 
                      type="text" 
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter your area"
                    />
                  </div>
                  <div>
                    <label className="settings-label">Date of Birth</label>
                    <input 
                      type="date" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="settings-input" 
                    />
                  </div>
                  <div>
                    <label className="settings-label">Income Level</label>
                    <select 
                      value={incomeLevel}
                      onChange={(e) => setIncomeLevel(e.target.value)}
                      className="settings-input" 
                    >
                      {incomeLevels.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="settings-label">Aadhaar/PAN Number</label>
                    <input 
                      type="text" 
                      value={aadhaarPan}
                      onChange={(e) => setAadhaarPan(e.target.value)}
                      className="settings-input" 
                      placeholder="Enter Aadhaar or PAN number"
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
                      <input 
                        type="checkbox" 
                        className="settings-toggle-input" 
                        checked={darkMode}
                        onChange={(e) => setDarkMode(e.target.checked)}
                      />
                      <div className="settings-toggle-slider"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="settings-actions-top-border">
                <button className="settings-save-button" onClick={handleSaveChanges}>Save Changes</button>
                <button className="settings-cancel-button" onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;