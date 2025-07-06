import React from 'react';
import '../styles/StockDashboard.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', NIFTY: 18000, SENSEX: 60000 },
  { name: 'Feb', NIFTY: 18200, SENSEX: 60500 },
  { name: 'Mar', NIFTY: 18100, SENSEX: 60200 },
  { name: 'Apr', NIFTY: 18500, SENSEX: 61000 },
  { name: 'May', NIFTY: 18300, SENSEX: 60700 },
  { name: 'Jun', NIFTY: 18700, SENSEX: 61500 },
];

const StockDashboard = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>Indian Stock Market Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* NIFTY 50 Card */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#007bff', marginBottom: '15px' }}>NIFTY 50</h2>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>18,700.50 <span style={{ color: 'green', fontSize: '18px' }}>+0.5%</span></p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="NIFTY" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* SENSEX Card */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '15px' }}>SENSEX</h2>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>61,500.25 <span style={{ color: 'red', fontSize: '18px' }}>-0.2%</span></p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="SENSEX" stroke="#82ca9d" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Top Gainers Card */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#28a745', marginBottom: '15px' }}>Top Gainers</h2>
          <ul>
            <li style={{ marginBottom: '8px' }}>Reliance Industries <span style={{ float: 'right', color: 'green' }}>+2.1%</span></li>
            <li style={{ marginBottom: '8px' }}>TCS <span style={{ float: 'right', color: 'green' }}>+1.8%</span></li>
            <li style={{ marginBottom: '8px' }}>HDFC Bank <span style={{ float: 'right', color: 'green' }}>+1.5%</span></li>
          </ul>
        </div>

        {/* Top Losers Card */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '15px' }}>Top Losers</h2>
          <ul>
            <li style={{ marginBottom: '8px' }}>Infosys <span style={{ float: 'right', color: 'red' }}>-1.2%</span></li>
            <li style={{ marginBottom: '8px' }}>ICICI Bank <span style={{ float: 'right', color: 'red' }}>-0.9%</span></li>
            <li style={{ marginBottom: '8px' }}>Axis Bank <span style={{ float: 'right', color: 'red' }}>-0.7%</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;
