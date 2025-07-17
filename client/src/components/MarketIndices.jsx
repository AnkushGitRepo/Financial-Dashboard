import React, { useEffect, useState } from 'react';
import '../../src/styles/MarketIndices.css';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Import Filler plugin
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // Register Filler plugin
);

const MarketIndices = () => {
  const [marketData, setMarketData] = useState([]);
  const [historicalData, setHistoricalData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await axios.get('/api/v1/market/live');
        setMarketData(response.data.data);
      } catch (error) {
        console.error('Error fetching live market data:', error);
      }
    };

    const fetchHistoricalData = async (ticker) => {
      try {
        // This is a placeholder. You'll need a backend endpoint to fetch historical data.
        // For now, we'll generate dummy data.
        const dummyData = Array.from({ length: 12 }, (_, i) => ({
          date: new Date(2024, i, 1).toISOString().split('T')[0],
          price: Math.random() * 1000 + 10000, // Dummy price
        }));
        return dummyData;
      } catch (error) {
        console.error(`Error fetching historical data for ${ticker}:`, error);
        return [];
      }
    };

    fetchMarketData();

    // Fetch historical data for the top 4 indices
    const top4Tickers = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT']; // Assuming these are the top 4
    top4Tickers.forEach(async (ticker) => {
      const data = await fetchHistoricalData(ticker);
      setHistoricalData((prev) => ({
        ...prev,
        [ticker]: data,
      }));
    });

    const interval = setInterval(fetchMarketData, 60000); // Refresh every 1 minute
    return () => clearInterval(interval);
  }, []);

  const calculateMovingAverage = (data, windowSize) => {
    const movingAverages = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        movingAverages.push(null); // Not enough data for the initial points
      } else {
        const sum = data.slice(i - windowSize + 1, i + 1).reduce((acc, val) => acc + val, 0);
        movingAverages.push(sum / windowSize);
      }
    }
    return movingAverages;
  };

  const getChartData = (index) => {
    const data = historicalData[index.ticker] || [];
    const prices = data.map((d) => d.price);
    const movingAverageData = calculateMovingAverage(prices, 12); // 12-month moving average for 1-year data

    const lastPrice = prices[prices.length - 1];
    const lastMovingAverage = movingAverageData[movingAverageData.length - 1];

    const isAboveMA = lastPrice > lastMovingAverage;

    const borderColor = isAboveMA ? '#5EE04A' : '#E04038'; // Green/Red hex codes
    const fillColor = isAboveMA ? 'rgba(182, 229, 175, 0.5)' : 'rgba(224, 82, 74, 0.5)'; // Lighter shade of line color with transparency

    return {
      labels: data.map((d) => d.date),
      datasets: [
        {
          label: 'Price',
          data: prices,
          fill: false,
          borderColor: borderColor,
          tension: 0.1,
          pointRadius: 0, // Hide points
        },
        {
          label: '12-Month MA',
          data: movingAverageData,
          fill: false,
          borderColor: 'blue', // Different color for moving average
          borderDash: [5, 5], // Dashed line for MA
          tension: 0.1,
          pointRadius: 0, // Hide points
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false, // Hide x-axis
      },
      y: {
        display: true, // Display y-axis
        ticks: {
          color: '#888', // Color for y-axis labels
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)', // Very light color for y-axis grid lines
          borderDash: [2, 2], // Dashed grid lines
        },
      },
    },
  };

  

  const handleIndexClick = (ticker) => {
    navigate(`/markets/indices/${ticker}`); // Redirect to individual index page
  };

  return (
    <div className="market-indices-container">
      <h2>Market Indices</h2>
      <div className="indices-grid">
        {marketData.slice(0, 4).map((index, idx) => (
          <div key={index.ticker} className={`index-card color-${idx}`} onClick={() => handleIndexClick(index.ticker)}>
            <h3>{index.symbol}</h3>
            <p>Level: {index.price?.toFixed(2)}</p>
            <p style={{ color: index.change >= 0 ? '#32CD32' : '#FF6347' }}>
              Change: {index.change?.toFixed(2)} ({index.changePercent?.toFixed(2)}%)
            </p>
            <div className="chart-container">
              {historicalData[index.ticker] && (
                <Line data={getChartData(index)} options={chartOptions} />
              )}
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default MarketIndices;
