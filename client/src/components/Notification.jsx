import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Notification = () => {
  const [stockRebalancingUpdates, setStockRebalancingUpdates] = useState(true);
  const [ipoInvestmentAdvice, setIpoInvestmentAdvice] = useState(true);
  const [newsletter, setNewsletter] = useState(true);
  const [promotionalMails, setPromotionalMails] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchNotificationPreferences = async () => {
      try {
        const { data } = await axios.get('/api/v1/user/me', { withCredentials: true });
        setStockRebalancingUpdates(data.user.stockRebalancingUpdates !== undefined ? data.user.stockRebalancingUpdates : false);
        setIpoInvestmentAdvice(data.user.ipoInvestmentAdvice !== undefined ? data.user.ipoInvestmentAdvice : false);
        setNewsletter(data.user.newsletter !== undefined ? data.user.newsletter : false);
        setPromotionalMails(data.user.promotionalMails !== undefined ? data.user.promotionalMails : false);
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      }
    };
    fetchNotificationPreferences();
  }, []);

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const { data } = await axios.put('/api/v1/user/me/update', {
        stockRebalancingUpdates,
        ipoInvestmentAdvice,
        newsletter,
        promotionalMails,
      }, {
        withCredentials: true,
      });
      alert('Notification preferences updated successfully!');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      alert('Failed to update notification preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-card">
      <h2 className="settings-main-title">Notification Settings</h2>
      <div className="settings-section-space">
        <div className="settings-display-space">
          {/* Stock Rebalancing Updates */}
          <div className="settings-display-item">
            <div>
              <p className="settings-display-text-bold">Stock Rebalancing Updates</p>
              <p className="settings-display-text-muted">Receive notifications about changes in your stock portfolio rebalancing.</p>
            </div>
            <label className="settings-toggle-switch">
              <input 
                type="checkbox" 
                className="settings-toggle-input" 
                checked={stockRebalancingUpdates}
                onChange={(e) => setStockRebalancingUpdates(e.target.checked)}
              />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          {/* IPO Investment Advice Mail */}
          <div className="settings-display-item">
            <div>
              <p className="settings-display-text-bold">IPO Investment Advice Mail</p>
              <p className="settings-display-text-muted">Get emails with advice and updates on upcoming IPOs.</p>
            </div>
            <label className="settings-toggle-switch">
              <input 
                type="checkbox" 
                className="settings-toggle-input" 
                checked={ipoInvestmentAdvice}
                onChange={(e) => setIpoInvestmentAdvice(e.target.checked)}
              />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          {/* Newsletter */}
          <div className="settings-display-item">
            <div>
              <p className="settings-display-text-bold">Newsletter</p>
              <p className="settings-display-text-muted">Subscribe to our weekly newsletter for market insights and news.</p>
            </div>
            <label className="settings-toggle-switch">
              <input 
                type="checkbox" 
                className="settings-toggle-input" 
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
              />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          {/* Promotional Mails */}
          <div className="settings-display-item">
            <div>
              <p className="settings-display-text-bold">Promotional Mails</p>
              <p className="settings-display-text-muted">Receive special offers, promotions, and updates from our partners.</p>
            </div>
            <label className="settings-toggle-switch">
              <input 
                type="checkbox" 
                className="settings-toggle-input" 
                checked={promotionalMails}
                onChange={(e) => setPromotionalMails(e.target.checked)}
              />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="settings-actions-top-border">
          <button 
            className="settings-save-button"
            onClick={handleSaveNotifications}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;