import React from 'react';
import IndianMarket from '../components/IndianMarket';
import GlobalMarket from '../components/GlobalMarket';
import MarketNews from '../components/MarketNews';
import '../styles/MarketSection.css'; // Import the shared CSS
import '../styles/Markets.css'; // Import the new CSS

const Markets = () => {
  return (
    <div className="markets-page-container">
      <div className="title-container">
        <h1 className="market-title">Market Overview</h1>
      </div>
      <IndianMarket />
      <GlobalMarket />
      <MarketNews />
    </div>
  );
};

export default Markets;