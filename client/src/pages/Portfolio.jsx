import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaExternalLinkAlt, FaEdit } from 'react-icons/fa';
import '../styles/Portfolio.css'; // Import the new CSS file

const Portfolio = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showEditTransactionForm, setShowEditTransactionForm] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [liveStockData, setLiveStockData] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Calculated portfolio summary states
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalCurrentValue, setTotalCurrentValue] = useState(0);
  const [totalProfitValue, setTotalProfitValue] = useState(0);
  const [totalProfitPercentage, setTotalProfitPercentage] = useState(0);

  // Form states
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); // Default to current date

  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');

  useEffect(() => {
    const fetchPortfolioItems = async () => {
      try {
        const { data } = await axios.get('/api/v1/user/portfolio', { withCredentials: true });
        setPortfolioItems(data.portfolioItems);
        console.log('Fetched portfolio items:', data.portfolioItems);
      } catch (error) {
        console.error('Error fetching portfolio items:', error.response?.data?.message || error.message);
      }
    };

    fetchPortfolioItems();
  }, []);

  useEffect(() => {
    let invested = 0;
    let currentValue = 0;

    portfolioItems.forEach(item => {
      invested += item.purchasePrice * item.quantity;
      const yahooTicker = item.stock["Yahoo Finance Ticker (NSE)"] || item.stock["Yahoo Finance Ticker (BSE)"];
      const currentPrice = liveStockData[yahooTicker]?.currentPrice;
      if (currentPrice) {
        currentValue += currentPrice * item.quantity;
      }
    });

    const profitValue = currentValue - invested;
    const profitPercentage = invested > 0 ? (profitValue / invested) * 100 : 0;

    setTotalInvested(invested);
    setTotalCurrentValue(currentValue);
    setTotalProfitValue(profitValue);
    setTotalProfitPercentage(profitPercentage);

  }, [portfolioItems, liveStockData]);

  useEffect(() => {
    const fetchLiveStockData = async () => {
      if (portfolioItems.length > 0) {
        const tickers = portfolioItems.map(item => item.stock["Yahoo Finance Ticker (NSE)"] || item.stock["Yahoo Finance Ticker (BSE)"]).filter(Boolean);
        console.log('Tickers for live data fetch:', tickers);
        if (tickers.length > 0) {
          try {
            const { data } = await axios.get(`/api/v1/market/stocks/live-data?tickers=${tickers.join(',')}`);
            setLiveStockData(data.liveData);
            console.log('Fetched live stock data:', data.liveData);
          } catch (error) {
            console.error('Error fetching live stock data:', error.response?.data?.message || error.message);
          }
        }
      }
    };

    fetchLiveStockData();
    const interval = setInterval(fetchLiveStockData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [portfolioItems]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 0) {
        setLoading(true);
        try {
          // Using the same search API as Stocks.jsx
          const { data } = await axios.get(`/api/v1/user/stocks/search?query=${searchQuery}`);
          setSearchResults(data.stocks);
        } catch (error) {
          console.error('Error fetching search results:', error);
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setShowAddTransactionForm(true);
    setSearchQuery(''); // Clear search query after selection
    setSearchResults([]); // Clear search results
  };

  const handleAddTransaction = async (event) => {
    event.preventDefault();
    // For now, just log the data. In a real app, you'd send this to your backend.
    try {
      const response = await axios.post(
        '/api/v1/user/portfolio/add',
        {
          stock: selectedStock,
          purchasePrice,
          quantity,
          purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
        },
        { withCredentials: true }
      );
      console.log(response.data.message);
      // Optionally, show a success toast
      // toast.success(response.data.message);
      // Re-fetch portfolio items after successful addition
      const { data: updatedPortfolio } = await axios.get('/api/v1/user/portfolio', { withCredentials: true });
      setPortfolioItems(updatedPortfolio.portfolioItems);
    } catch (error) {
      console.error('Error adding stock to portfolio:', error.response?.data?.message || error.message);
      // Optionally, show an error toast
      // toast.error(error.response?.data?.message || 'Failed to add stock to portfolio.');
    }

    // Reset form and close popup
    setPurchasePrice('');
    setQuantity('');
    setPurchaseDate(new Date().toISOString().split('T')[0]); // Reset to current date
    setShowAddTransactionForm(false);
    setSelectedStock(null);
  };

  const handleCloseForm = () => {
    setShowAddTransactionForm(false);
    setSelectedStock(null);
    setPurchasePrice('');
    setQuantity('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
  };

  const handleCloseEditForm = () => {
    setShowEditTransactionForm(false);
    setItemToEdit(null);
    setEditPurchasePrice('');
    setEditQuantity('');
    setEditPurchaseDate('');
  };

  const handleUpdateTransaction = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.put(
        `/api/v1/user/portfolio/${itemToEdit._id}`,
        {
          purchasePrice: editPurchasePrice,
          quantity: editQuantity,
          purchaseDate: editPurchaseDate,
        },
        { withCredentials: true }
      );
      console.log(response.data.message);
      // Re-fetch portfolio items after successful update
      const { data: updatedPortfolio } = await axios.get('/api/v1/user/portfolio', { withCredentials: true });
      setPortfolioItems(updatedPortfolio.portfolioItems);
      handleCloseEditForm();
    } catch (error) {
      console.error('Error updating stock in portfolio:', error.response?.data?.message || error.message);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await axios.delete(`/api/v1/user/portfolio/${itemToDelete._id}`, { withCredentials: true });
      console.log(response.data.message);
      // Optionally, show a success toast
      // toast.success(response.data.message);
      // Re-fetch portfolio items after successful deletion
      const { data: updatedPortfolio } = await axios.get('/api/v1/user/portfolio', { withCredentials: true });
      setPortfolioItems(updatedPortfolio.portfolioItems);
    } catch (error) {
      console.error('Error deleting stock from portfolio:', error.response?.data?.message || error.message);
      // Optionally, show an error toast
      // toast.error(error.response?.data?.message || 'Failed to delete stock from portfolio.');
    } finally {
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
    }
  };

  const handleLinkClick = (item) => {
    const stockIdentifier = item.stock["Yahoo Finance Ticker (NSE)"] || item.stock["Yahoo Finance Ticker (BSE)"] || item.stock["Security Id"];
    if (stockIdentifier) {
      navigate(`/stocks/${stockIdentifier}`);
    }
  };

  const handleEditClick = (item) => {
    setItemToEdit(item);
    setEditPurchasePrice(item.purchasePrice);
    setEditQuantity(item.quantity);
    setEditPurchaseDate(item.purchaseDate.split('T')[0]); // Format date for input
    setShowEditTransactionForm(true);
  };

  return (
    <div className="portfolio-page">
      

      <div className="portfolio-main-title-container">
        <h1 className="portfolio-main-title">My Portfolio</h1>
      </div>

      <section className="stock-search-section">
        <h2>Search Stock</h2>
        <input
          type="text"
          placeholder="Search by company name or symbol..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="stock-search-input"
        />
        {loading && <p>Loading recommendations...</p>}
        {searchQuery.length > 0 && searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map((stock) => (
              <div
                key={stock["Security Code"]}
                className="search-result-item"
                onClick={() => handleStockSelect(stock)}
              >
                <p>{stock["Issuer Name"]} ({stock["Security Id"]})</p>
                <p className="ticker-info">BSE: {stock["Yahoo Finance Ticker (BSE)"]}, NSE: {stock["Yahoo Finance Ticker (NSE)"]}</p>
              </div>
            ))}
          </div>
        )}
        {searchQuery.length > 0 && !loading && searchResults.length === 0 && (
          <p>No results found.</p>
        )}
      </section>

      {showAddTransactionForm && selectedStock && (
        <div className="add-transaction-popup">
          <div className="popup-content">
            <h3>Add In Portfolio : {selectedStock["Issuer Name"]} ({selectedStock["Security Id"]})</h3>
            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label htmlFor="purchasePrice">Price:</label>
                <input
                  type="number"
                  id="purchasePrice"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="quantity">Quantity:</label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="purchaseDate">Date:</label>
                <input
                  type="date"
                  id="purchaseDate"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">Add to Portfolio</button>
                <button type="button" onClick={handleCloseForm} className="cancel-button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTransactionForm && itemToEdit && (
        <div className="add-transaction-popup"> {/* Reusing the same popup style */} 
          <div className="popup-content">
            <h3>Edit Holding: {itemToEdit.stock["Issuer Name"]} ({itemToEdit.stock["Security Id"]})</h3>
            <form onSubmit={handleUpdateTransaction}>
              <div className="form-group">
                <label htmlFor="editPurchasePrice">Price:</label>
                <input
                  type="number"
                  id="editPurchasePrice"
                  value={editPurchasePrice}
                  onChange={(e) => setEditPurchasePrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editQuantity">Quantity:</label>
                <input
                  type="number"
                  id="editQuantity"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editPurchaseDate">Date:</label>
                <input
                  type="date"
                  id="editPurchaseDate"
                  value={editPurchaseDate}
                  onChange={(e) => setEditPurchaseDate(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">Update Holding</button>
                <button type="button" onClick={handleCloseEditForm} className="cancel-button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Placeholder for portfolio holdings */}
      <section className="portfolio-summary">
        <h2>Portfolio Summary</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Total Invested</h3>
            <p>{totalInvested.toFixed(2)}</p>
          </div>
          <div className="summary-card">
            <h3>Current Total Value</h3>
            <p>{totalCurrentValue.toFixed(2)}</p>
          </div>
          <div className="summary-card">
            <h3>Total Profit/Loss</h3>
            <p className={totalProfitValue >= 0 ? 'profit-text' : 'loss-text'}>{totalProfitValue.toFixed(2)}</p>
          </div>
          <div className="summary-card">
            <h3>Profit/Loss (%)</h3>
            <p className={totalProfitPercentage >= 0 ? 'profit-text' : 'loss-text'}>{totalProfitPercentage.toFixed(2)}%</p>
          </div>
        </div>
      </section>

      <section className="portfolio-holdings">
        <h2>Holdings</h2>
        {portfolioItems.length === 0 ? (
          <p>No holdings added yet. Search for a stock above to add your first transaction.</p>
        ) : (
          <div className="holdings-list">
            {portfolioItems.map((item) => {
              const yahooTicker = item.stock["Yahoo Finance Ticker (NSE)"] || item.stock["Yahoo Finance Ticker (BSE)"];
              const currentPrice = liveStockData[yahooTicker]?.currentPrice || 'N/A';
              const profitValue = currentPrice !== 'N/A' ? (currentPrice - item.purchasePrice) * item.quantity : 'N/A';
              const profitPercentage = currentPrice !== 'N/A' ? ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100 : 'N/A';
              const isProfit = profitValue !== 'N/A' && profitValue >= 0;

              return (
                <div key={item._id} className="holding-card">
                  <div className="holding-card-header">
                    <h3>{item.stock["Issuer Name"]} ({item.stock["Security Id"]})</h3>
                    <p><b>Quantity:</b> {item.quantity}</p>
                    <p><b>Purchase Date:</b> {new Date(item.purchaseDate).toLocaleDateString()}</p>
                  </div>
                  <div className="holding-card-prices">
                    <div className="price-item">
                      <span className="price-label">Buy Price</span>
                      <span className="price-value">{item.purchasePrice.toFixed(2)}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-label">Current Price</span>
                      <span className="price-value">{currentPrice !== 'N/A' ? currentPrice.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div className="price-item">
                      <span className="price-label">P/L (%)</span>
                      <span className={`price-value ${isProfit ? 'profit-text' : 'loss-text'}`}>
                        {profitPercentage !== 'N/A' ? profitPercentage.toFixed(2) + '%' : 'N/A'}
                      </span>
                    </div>
                    <div className="price-item">
                      <span className="price-label">P/L (Value)</span>
                      <span className={`price-value ${isProfit ? 'profit-text' : 'loss-text'}`}>
                        {profitValue !== 'N/A' ? profitValue.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="holding-card-actions">
                    <FaEdit className="action-icon edit-icon" onClick={() => handleEditClick(item)} />
                    <FaTrash className="action-icon delete-icon" onClick={() => handleDeleteClick(item)} />
                    <FaExternalLinkAlt className="action-icon link-icon" onClick={() => handleLinkClick(item)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showDeleteConfirmation && itemToDelete && (
        <div className="delete-confirmation-popup">
          <div className="popup-content">
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete {itemToDelete.stock["Issuer Name"]} from your portfolio?</p>
            <div className="form-actions">
              <button className="submit-button" onClick={handleConfirmDelete}>Delete</button>
              <button className="cancel-button" onClick={() => setShowDeleteConfirmation(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;