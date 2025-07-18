import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/StockDashboard.css'; // Assuming you have a CSS file for stock dashboard
import '../styles/Stocks.css';

const Stocks = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [popularIndianStocks, setPopularIndianStocks] = useState([]);

  const popularTickers = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "BAJAJFINSV.NS", "BAJFINANCE.NS", "BAJAJ-AUTO.NS", "MARUTI.NS", "TATAMOTORS.NS", "HEROMOTOCO.NS", "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "NTPC.NS", "POWERGRID.NS", "COALINDIA.NS"
  ];

  useEffect(() => {
    const fetchPopularStocks = async () => {
      try {
        const { data } = await axios.get(`/api/v1/market/stocks/data?tickers=${popularTickers.join(',')}`);
        const formattedStocks = data.stocksData.map(stock => ({
          name: stock.longName,
          symbol: stock.symbol,
          price: stock.regularMarketPrice ? stock.regularMarketPrice.toFixed(2) : 'N/A',
          change: stock.regularMarketChange ? stock.regularMarketChange.toFixed(2) : 'N/A',
          changePercent: stock.regularMarketChangePercent ? stock.regularMarketChangePercent.toFixed(2) : 'N/A',
          changeType: stock.regularMarketChange >= 0 ? 'positive' : 'negative',
        }));
        setPopularIndianStocks(formattedStocks);
      } catch (error) {
        console.error('Error fetching popular stocks:', error);
      }
    };

    fetchPopularStocks();

    const interval = setInterval(fetchPopularStocks, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

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
      <div className="stocks-title-container">
        <h1 className="stocks-page-title">Stocks Dashboard</h1>
      </div>
      

      <section className="stock-search-section">
        <h2><b>Search Stocks</b></h2>
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
          <h2><b>Popular Indian Stocks</b></h2>
          <div className="stocks-list">
            {popularIndianStocks.map((stock) => (
              <div key={stock.symbol} className="stock-card" onClick={() => navigate(`/stocks/${stock.symbol}`)}>
                <h3>{stock.name} ({stock.symbol})</h3>
                <p className="value">{stock.price} <span className={`change ${stock.changeType}`}>{stock.change} ({stock.changePercent}%)</span></p>
              </div>
            ))}
          </div>
        </section>
      )}

      
    </div>
  );
};

export default Stocks;