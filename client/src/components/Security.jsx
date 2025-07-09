import React, { useState } from 'react';
import axios from 'axios';

const Security = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async () => {
    setIsSaving(true);
    if (newPassword !== confirmNewPassword) {
      alert('New password and confirm password do not match.');
      setIsSaving(false);
      return;
    }

    try {
      const { data } = await axios.put('/api/v1/user/password/update', {
        oldPassword: currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword,
      }, {
        withCredentials: true,
      });
      alert(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-card">
      <h2 className="settings-main-title">Security Settings</h2>
      <div className="settings-section-space">
        <div>
          <h3 className="settings-section-subtitle">Change Password</h3>
          <div className="settings-form-grid">
            <div>
              <label className="settings-label">Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="settings-input" 
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="settings-label">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="settings-input" 
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="settings-label">Re-enter New Password</label>
              <input 
                type="password" 
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="settings-input" 
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <div className="settings-actions-top-border">
            <button 
              className="settings-save-button"
              onClick={handleChangePassword}
              disabled={isSaving}
            >
              {isSaving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;