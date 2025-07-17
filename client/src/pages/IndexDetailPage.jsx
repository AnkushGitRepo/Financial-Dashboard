import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import '../../src/styles/IndexDetailPage.css'; // Import the new CSS file

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const IndexDetailPage = () => {
  const { ticker } = useParams();
  const [indexData, setIndexData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedRange, setSelectedRange] = useState('1y'); // Default to 1 year
  const [maPeriod, setMaPeriod] = useState(null); // State for selected MA period
  const [customMaInput, setCustomMaInput] = useState(''); // State for custom MA input

  useEffect(() => {
    const fetchIndexData = async () => {
      try {
        const response = await axios.get(`/api/v1/market/indices/${ticker}?range=${selectedRange}`);
        setIndexData(response.data.data.current);
        setHistoricalData(response.data.data.historical);

        // Set default MA period based on selected range if not already set
        if (maPeriod === null) {
          switch (selectedRange) {
            case '1d':
              setMaPeriod(5); // Example: 5-period MA for 1 day
              break;
            case '5d':
              setMaPeriod(5); // Example: 5-period MA for 1 week
              break;
            case '1mo':
              setMaPeriod(7); // Example: 7-period MA for 1 month
              break;
            case '3mo':
              setMaPeriod(20); // Example: 20-period MA for 3 months
              break;
            case '6mo':
              setMaPeriod(50); // Example: 50-period MA for 6 months
              break;
            case '1y':
              setMaPeriod(50); // Example: 50-period MA for 1 year
              break;
            case '5y':
              setMaPeriod(200); // Example: 200-period MA for 5 years
              break;
            default:
              setMaPeriod(50); // Default MA for other ranges
          }
        }

      } catch (error) {
        console.error(`Error fetching data for ${ticker} with range ${selectedRange}:`, error);
      }
    };

    fetchIndexData();
    const interval = setInterval(fetchIndexData, 60000); // Refresh every 1 minute
    return () => clearInterval(interval);
  }, [ticker, selectedRange, maPeriod]); // Add maPeriod to dependencies

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

  const getChartData = () => {
    const prices = historicalData.map((d) => d.price);
    const borderColor = indexData && indexData.regularMarketChange >= 0 ? '#006400' : '#8B0000';
    const movingAverageData = calculateMovingAverage(prices, maPeriod); // Use maPeriod

    // Determine fill color based on current price relative to 52-week high/low
    let fillColor = 'rgba(0, 0, 0, 0.1)'; // Default light grey
    if (indexData && indexData.fiftyTwoWeekHigh && indexData.fiftyTwoWeekLow) {
      const range = indexData.fiftyTwoWeekHigh - indexData.fiftyTwoWeekLow;
      const position = (indexData.regularMarketPrice - indexData.fiftyTwoWeekLow) / range;

      if (position > 0.75) {
        fillColor = 'rgba(144, 238, 144, 0.2)'; // Light Green (closer to high)
      } else if (position < 0.25) {
        fillColor = 'rgba(255, 99, 71, 0.2)'; // Light Red (closer to low)
      } else {
        fillColor = 'rgba(173, 216, 230, 0.2)'; // Light Blue (middle range)
      }
    }

    return {
      labels: historicalData.map((d) => d.date),
      datasets: [
        {
          label: 'Price',
          data: prices,
          fill: true, // Fill the area under the line
          backgroundColor: fillColor, // Dynamic fill color
          borderColor: borderColor,
          tension: 0.1,
          pointRadius: 0,
        },
        {
          label: `${maPeriod}-Period MA`,
          data: movingAverageData,
          fill: false,
          borderColor: 'blue',
          borderDash: [5, 5],
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    };
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    setMaPeriod(null); // Reset MA period to trigger default calculation
  };

  const handleMaPeriodChange = (period) => {
    setMaPeriod(period);
  };

  const handleCustomMaSubmit = () => {
    const period = parseInt(customMaInput);
    if (!isNaN(period) && period > 0) {
      setMaPeriod(period);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: true,
        text: indexData ? `${indexData.longName || indexData.symbol} Performance` : 'Index Performance',
        color: '#333',
        font: { size: 18 },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10,
          color: '#888',
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        ticks: {
          color: '#888',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          borderDash: [2, 2],
        },
      },
    },
  };

  if (!indexData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="index-detail-page-wrapper">
      <h2>{indexData.longName || indexData.symbol} Details</h2>
      <div className="index-summary">
        <p><strong>Current Level:</strong> {indexData.regularMarketPrice?.toFixed(2)}</p>
        <p className={indexData.regularMarketChange >= 0 ? 'positive-change' : 'negative-change'}>
          <strong>Change:</strong> {indexData.regularMarketChange?.toFixed(2)} ({indexData.regularMarketChangePercent?.toFixed(2)}%)
        </p>
        <p><strong>52-Week High:</strong> {indexData.fiftyTwoWeekHigh?.toFixed(2)}</p>
        <p><strong>52-Week Low:</strong> {indexData.fiftyTwoWeekLow?.toFixed(2)}</p>
      </div>
      <div className="range-buttons-container">
        <button onClick={() => handleRangeChange('1d')}>1D</button>
        <button onClick={() => handleRangeChange('5d')}>5D</button>
        <button onClick={() => handleRangeChange('1mo')}>1M</button>
        <button onClick={() => handleRangeChange('3mo')}>3M</button>
        <button onClick={() => handleRangeChange('6mo')}>6M</button>
        <button onClick={() => handleRangeChange('1y')}>1Y</button>
        <button onClick={() => handleRangeChange('5y')}>5Y</button>
      </div>
      <div className="ma-buttons-container">
        <button onClick={() => handleMaPeriodChange(5)}>5-Period MA</button>
        <button onClick={() => handleMaPeriodChange(20)}>20-Period MA</button>
        <button onClick={() => handleMaPeriodChange(50)}>50-Period MA</button>
        <input
          type="number"
          value={customMaInput}
          onChange={(e) => setCustomMaInput(e.target.value)}
          placeholder="Custom MA Period"
        />
        <button onClick={handleCustomMaSubmit}>Apply Custom MA</button>
      </div>
      <div className="chart-container">
        {historicalData.length > 0 && (
          <Line data={getChartData()} options={chartOptions} />
        )}
      </div>
      <div className="details-section">
        <h3>All Details:</h3>
        <table className="details-table">
          <tbody>
            <tr><td><strong>Symbol:</strong></td><td>{indexData.symbol}</td></tr>
            <tr><td><strong>Short Name:</strong></td><td>{indexData.longName || indexData.symbol}</td></tr>
            <tr><td><strong>Current Price:</strong></td><td>{indexData.regularMarketPrice?.toFixed(2)}</td></tr>
            <tr><td><strong>Change:</strong></td><td className={indexData.regularMarketChange >= 0 ? 'positive-change' : 'negative-change'}>{indexData.regularMarketChange?.toFixed(2)}</td></tr>
            <tr><td><strong>Change Percent:</strong></td><td className={indexData.regularMarketChangePercent >= 0 ? 'positive-change' : 'negative-change'}>{indexData.regularMarketChangePercent?.toFixed(2)}%</td></tr>
            <tr><td><strong>Day High:</strong></td><td>{indexData.regularMarketDayHigh?.toFixed(2)}</td></tr>
            <tr><td><strong>Day Low:</strong></td><td>{indexData.regularMarketDayLow?.toFixed(2)}</td></tr>
            <tr><td><strong>Previous Close:</strong></td><td>{indexData.regularMarketPreviousClose?.toFixed(2)}</td></tr>
            <tr><td><strong>Open:</strong></td><td>{indexData.regularMarketOpen?.toFixed(2)}</td></tr>
            <tr><td><strong>Volume:</strong></td><td>{indexData.regularMarketVolume?.toLocaleString()}</td></tr>
            <tr><td><strong>Market State:</strong></td><td>{indexData.marketState}</td></tr>
            <tr><td><strong>Exchange:</strong></td><td>{indexData.exchange}</td></tr>
            <tr><td><strong>Full Exchange Name:</strong></td><td>{indexData.fullExchangeName}</td></tr>
            <tr><td><strong>Currency:</strong></td><td>{indexData.currency}</td></tr>
            <tr><td><strong>GMT Offset (ms):</strong></td><td>{indexData.gmtOffSetMilliseconds}</td></tr>
            <tr><td><strong>Last Update Time:</strong></td><td>{new Date(indexData.regularMarketTime * 1000).toLocaleString()}</td></tr>
            <tr><td><strong>Quote Type:</strong></td><td>{indexData.quoteType}</td></tr>
            <tr><td><strong>52-Week High:</strong></td><td>{indexData.fiftyTwoWeekHigh?.toFixed(2)}</td></tr>
            <tr><td><strong>52-Week Low:</strong></td><td>{indexData.fiftyTwoWeekLow?.toFixed(2)}</td></tr>
            <tr><td><strong>Regular Market Source:</strong></td><td>{indexData.regularMarketSource}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IndexDetailPage;