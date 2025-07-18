import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/StockDashboard.css'; // Assuming you have a CSS file for stock dashboard

const Stocks = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const popularIndianStocks = [
    { name: 'Reliance Industries', symbol: 'RELIANCE', price: '2,900.50', change: '+1.2%', changeType: 'positive' },
    { name: 'Tata Consultancy Services', symbol: 'TCS', price: '3,800.25', change: '-0.5%', changeType: 'negative' },
    { name: 'HDFC Bank', symbol: 'HDFCBANK', price: '1,550.75', change: '+0.8%', changeType: 'positive' },
    { name: 'ICICI Bank', symbol: 'ICICIBANK', price: '1,000.10', change: '+1.5%', changeType: 'positive' },
    { name: 'Infosys', symbol: 'INFY', price: '1,600.30', change: '-0.2%', changeType: 'negative' },
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 0) {
        setLoading(true);
        try {
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

  const handleStockClick = (stock) => {
    // Assuming you want to navigate to a detail page for the stock
    // You can use Security Id or Yahoo Finance Ticker (NSE) for the URL
    const stockIdentifier = stock["Yahoo Finance Ticker (NSE)"] || stock["Security Id"];
    if (stockIdentifier) {
      navigate(`/stocks/${stockIdentifier}`);
    }
  };

  return (
    <div className="stocks-page">
      <h1>Stocks Dashboard</h1>
      <p>Welcome to your personalized stocks overview.</p>

      <section className="stock-search-section">
        <h2>Search Indian Stocks</h2>
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
                onClick={() => handleStockClick(stock)}
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

      {!searchQuery && (
        <section className="popular-indian-stocks">
          <h2>Popular Indian Stocks</h2>
          <div className="stocks-list">
            {popularIndianStocks.map((stock) => (
              <div key={stock.symbol} className="stock-card" onClick={() => navigate(`/stocks/${stock.symbol}`)}>
                <h3>{stock.name} ({stock.symbol})</h3>
                <p className="value">{stock.price} <span className={`change ${stock.changeType}`}>{stock.change}</span></p>
              </div>
            ))}
          </div>
        </section>
      )}

      
    </div>
  );
};

export default Stocks;