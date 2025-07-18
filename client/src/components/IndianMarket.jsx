import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import '../styles/MarketSection.css';

const IndianMarket = () => {
  const [indianIndices, setIndianIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedTickers, setUpdatedTickers] = useState(new Set());

  useEffect(() => {
    const fetchIndianIndices = async () => {
      try {
        const { data } = await axios.get('/api/v1/market/all-indices');
        const newUpdated = new Set();

        setIndianIndices(prevIndices => {
          if (JSON.stringify(prevIndices) !== JSON.stringify(data.indianIndices)) {
            data.indianIndices.forEach(newIndex => {
              const oldIndex = prevIndices.find(p => p.ticker === newIndex.ticker);
              if (!oldIndex || oldIndex.price !== newIndex.price) {
                newUpdated.add(newIndex.ticker);
              }
            });
            return data.indianIndices;
          }
          return prevIndices;
        });

        setUpdatedTickers(newUpdated);
        setTimeout(() => setUpdatedTickers(new Set()), 1000); // Reset after animation

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch Indian market indices.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchIndianIndices();
    const interval = setInterval(fetchIndianIndices, 20000); // Refresh every 20 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="market-section-loading">Loading Indian Market Data...</div>;
  if (error) return <div className="market-section-error">Error: {error}</div>;

  return (
    <div className="market-section">
      <h2>Indian Market</h2>
      <div className="market-cards-container">
        {indianIndices.map((index) => (
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

export default IndianMarket;
