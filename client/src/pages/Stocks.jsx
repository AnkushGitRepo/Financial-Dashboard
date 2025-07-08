import React from 'react';
import '../styles/StockDashboard.css'; // Assuming you have a CSS file for stock dashboard

const Stocks = () => {
  return (
    <div className="stocks-page">
      <h1>Stocks Dashboard</h1>
      <p>Welcome to your personalized stocks overview.</p>

      <section className="stocks-summary">
        <h2>Market Summary</h2>
        <div className="summary-cards">
          <div className="card">
            <h3>S&P 500</h3>
            <p className="value">4,500.23 <span className="change positive">+0.5%</span></p>
          </div>
          <div className="card">
            <h3>Dow Jones</h3>
            <p className="value">35,200.10 <span className="change negative">-0.2%</span></p>
          </div>
          <div className="card">
            <h3>NASDAQ</h3>
            <p className="value">14,100.55 <span className="change positive">+0.8%</span></p>
          </div>
        </div>
      </section>

      <section className="top-movers">
        <h2>Top Movers Today</h2>
        <ul>
          <li>
            <span>Company A</span>
            <span className="change positive">+5.2%</span>
          </li>
          <li>
            <span>Company B</span>
            <span className="change negative">-3.1%</span>
          </li>
          <li>
            <span>Company C</span>
            <span className="change positive">+4.0%</span>
          </li>
        </ul>
      </section>

      <section className="your-portfolio">
        <h2>Your Portfolio at a Glance</h2>
        <p>You currently hold 10 stocks.</p>
        <button className="view-portfolio-btn">View Full Portfolio</button>
      </section>
    </div>
  );
};

export default Stocks;