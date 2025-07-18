import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import '../styles/MarketSection.css';

const GlobalMarket = () => {
  const [globalIndices, setGlobalIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedTickers, setUpdatedTickers] = useState(new Set());

  useEffect(() => {
    const fetchGlobalIndices = async () => {
      try {
        const { data } = await axios.get('/api/v1/market/all-indices');
        const newUpdated = new Set();

        setGlobalIndices(prevIndices => {
          if (JSON.stringify(prevIndices) !== JSON.stringify(data.globalIndices)) {
            data.globalIndices.forEach(newIndex => {
              const oldIndex = prevIndices.find(p => p.ticker === newIndex.ticker);
              if (!oldIndex || oldIndex.price !== newIndex.price) {
                newUpdated.add(newIndex.ticker);
              }
            });
            return data.globalIndices;
          }
          return prevIndices;
        });

        setUpdatedTickers(newUpdated);
        setTimeout(() => setUpdatedTickers(new Set()), 1000); // Reset after animation

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch Global market indices.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchGlobalIndices();
    const interval = setInterval(fetchGlobalIndices, 120000); // Refresh every 2 mintues
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="market-section-loading">Loading Global Market Data...</div>;
  if (error) return <div className="market-section-error">Error: {error}</div>;

  return (
    <div className="market-section">
      <h2>Global Market</h2>
      <div className="market-cards-container">
        {globalIndices.map((index) => (
          <Link 
            to={`/markets/indices/${index.ticker}`} 
            key={index.ticker} 
            className={`market-card ${index.change >= 0 ? 'positive' : 'negative'} ${updatedTickers.has(index.ticker) ? 'updated' : ''}`}>
            <h3>{index.symbol}</h3>
            <p className="market-price">{index.price?.toFixed(2)}</p>
            <p className={`market-change ${index.change >= 0 ? 'positive' : 'negative'}`}>
              {index.change >= 0 ? <FaArrowUp /> : <FaArrowDown />}
              {index.change?.toFixed(2)} ({index.changePercent?.toFixed(2)}%)
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default GlobalMarket;
