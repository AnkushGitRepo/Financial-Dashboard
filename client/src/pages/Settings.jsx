import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { PageLayout } from '../layout/PageLayout';
import { Bell, Globe, Lock, User, Settings as SettingsIcon } from 'lucide-react';
import Notification from '../components/Notification';
import Security from '../components/Security';
import '../styles/Settings.css';

const Settings = () => {
  const fileInputRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFullNameEditable, setIsFullNameEditable] = useState(false);
  const [isEmailEditable, setIsEmailEditable] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationTarget, setVerificationTarget] = useState({ type: '', value: '' });
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [dob, setDob] = useState('');
  const [incomeLevel, setIncomeLevel] = useState('');
  const [aadhaarPan, setAadhaarPan] = useState('');
  const [occupation, setOccupation] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('account'); // New state for active section

  const fetchUserDetails = async () => {
    try {
      const { data } = await axios.get('/api/v1/user/me', { withCredentials: true });
      setFullName(data.user.name || '');
      setEmail(data.user.email || '');
      setPhoneNumber(data.user.phone || '');
      setProfilePhotoPreview(data.user.avatar ? data.user.avatar.url : '');
      setAddress(data.user.address || '');
      setPincode(data.user.pincode || '');
      setCity(data.user.city || '');
      setArea(data.user.area || '');
      setDob(data.user.dob ? new Date(data.user.dob).toISOString().split('T')[0] : '');
      setIncomeLevel(data.user.incomeLevel || '');
      setAadhaarPan(data.user.aadhaarPan || '');
        setOccupation(data.user.occupation || '');
        setDarkMode(data.user.darkMode || false);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

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

  const handleEditSave = async (field) => {
    let newUserData = {};
    let shouldUpdate = false;

    if (field === 'fullName' && isFullNameEditable) {
      newUserData.name = fullName;
      shouldUpdate = true;
    } else if (field === 'email' && isEmailEditable) {
      // This will trigger re-verification flow later
      newUserData.email = email;
      shouldUpdate = true;
    } else if (field === 'phoneNumber' && isPhoneNumberEditable) {
      // This will trigger re-verification flow later
      newUserData.phone = phoneNumber;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      if (field === 'email') {
        try {
          const { data } = await axios.post('/api/v1/user/send-otp-for-update', newUserData, {
            withCredentials: true,
          });
          console.log('OTP request successful:', data);
          setVerificationTarget({ type: field, value: newUserData.email });
          setShowOtpVerification(true);
          alert(`An OTP has been sent to your new ${field}. Please check your inbox.`);
        } catch (error) {
          console.error(`Error requesting OTP for ${field}:`, error);
          alert(`Failed to send OTP. Please try again.`);
          // Revert editable state if OTP request fails
          if (field === 'email') setIsEmailEditable(false);
        }
      } else {
        try {
          const { data } = await axios.put('/api/v1/user/me/update', newUserData, {
            withCredentials: true,
          });
          console.log(`${field} updated successfully:`, data);
          alert(`${field} updated successfully!`);
          // After successful update, disable the field again
          if (field === 'fullName') setIsFullNameEditable(false);
        } catch (error) {
          console.error(`Error updating ${field}:`, error);
          alert(`Failed to update ${field}. Please try again.`);
        }
      }
    }
  };

  const handleSaveChanges = async () => {
    setIsSavingChanges(true); // Disable button
    try {
      const formData = new FormData();
      // Append all fields to formData
      formData.append('name', fullName);
      formData.append('email', email);
      formData.append('phone', phoneNumber);
      formData.append('address', address);
      formData.append('pincode', pincode);
      formData.append('city', city);
      formData.append('area', area);
      formData.append('dob', dob);
      formData.append('incomeLevel', incomeLevel);
      formData.append('aadhaarPan', aadhaarPan);
      formData.append('occupation', occupation);
      formData.append('darkMode', darkMode);
      // Only append profile photo if it's changed
      if (profilePhoto) {
        formData.append('avatar', profilePhoto);
      }

      const { data } = await axios.put('/api/v1/user/me/update', formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Profile updated successfully!');
      // Update the preview immediately after successful upload
      if (data.user.avatar) {
        setProfilePhotoPreview(data.user.avatar.url);
      }
      setProfilePhoto(null); // Clear the selected file
      fetchUserDetails(); // Re-fetch data after successful save

    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSavingChanges(false); // Re-enable button
    }
  };

  const handleOtpSubmit = async () => {
    try {
      const { type, value } = verificationTarget;
      const payload = { otp };
      if (type === 'email') {
        payload.email = value;
      } else if (type === 'phoneNumber') {
        payload.phone = value;
      }

      const { data } = await axios.post('/api/v1/user/verify-otp-for-update', payload, {
        withCredentials: true,
      });

      console.log('OTP verification successful:', data);
      alert(`Your ${type} has been successfully updated!`);
      setShowOtpVerification(false);
      setOtp('');
      // After successful verification, disable the field again
      if (type === 'email') setIsEmailEditable(false);
      else if (type === 'phoneNumber') setIsPhoneNumberEditable(false);

    } catch (error) {
      console.error('OTP verification failed:', error);
      alert('OTP verification failed. Please try again or check your OTP.');
    }
  };

  const handleCancel = () => {
    window.location.reload();
  };

  return (
    <PageLayout title="Settings">
      <div className="settings-grid">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <div className="settings-card">
            <h2 className="settings-sidebar-title">Settings</h2>
            <nav className="settings-nav-list">
              <button 
                className={`settings-nav-button ${activeSection === 'account' ? 'active' : ''}`}
                onClick={() => setActiveSection('account')}
              >
                <User className="settings-nav-icon" />
                Account
              </button>
              <button 
                className={`settings-nav-button ${activeSection === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveSection('notifications')}
              >
                <Bell className="settings-nav-icon" />
                Notifications
              </button>
              <button 
                className={`settings-nav-button ${activeSection === 'security' ? 'active' : ''}`}
                onClick={() => setActiveSection('security')}
              >
                <Lock className="settings-nav-icon" />
                Security
              </button>
              
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="settings-main-content">
          {activeSection === 'account' && (
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
                      <div className="settings-input-with-edit">
                        <input 
                          type="text" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="settings-input" 
                          placeholder="Enter your full name"
                          disabled={!isFullNameEditable}
                        />
                        <button 
                          className="settings-edit-button"
                          onClick={() => {
                            if (isFullNameEditable) {
                              handleEditSave('fullName');
                            }
                            setIsFullNameEditable(!isFullNameEditable);
                          }}
                        >
                          {isFullNameEditable ? 'Save' : 'Edit'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="settings-label">Email</label>
                      <div className="settings-input-with-edit">
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="settings-input" 
                          placeholder="Enter your email"
                          disabled={!isEmailEditable}
                        />
                        <button 
                          className="settings-edit-button"
                          onClick={() => {
                            if (isEmailEditable) {
                              handleEditSave('email');
                            }
                            setIsEmailEditable(!isEmailEditable);
                          }}
                        >
                          {isEmailEditable ? 'Save' : 'Edit'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="settings-label">Phone Number</label>
                      <input 
                        type="text" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="settings-input" 
                        placeholder="Enter your phone number"
                        disabled={true}
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
                  <button className="settings-save-button" onClick={handleSaveChanges} disabled={isSavingChanges}>Save Changes</button>
                  <button className="settings-cancel-button" onClick={handleCancel}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <Notification />
          )}

          {activeSection === 'security' && (
            <Security />
          )}
        </div>
      </div>

      {showOtpVerification && (
        <div className="otp-verification-overlay">
          <div className="otp-verification-modal">
            <h2>Verify your new {verificationTarget.type}</h2>
            <p>An OTP has been sent to {verificationTarget.value}. Please enter it below.</p>
            <input 
              type="text" 
              placeholder="Enter OTP" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="settings-input otp-input"
            />
            <div className="otp-modal-actions">
              <button className="settings-save-button" onClick={handleOtpSubmit}>Verify OTP</button>
              <button className="settings-cancel-button" onClick={() => setShowOtpVerification(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Settings;