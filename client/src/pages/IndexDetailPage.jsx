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
  Filler, // Import Filler plugin
} from 'chart.js';
import '../../src/styles/IndexDetailPage.css'; // Import the new CSS file

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

const IndexDetailPage = () => {
  const { ticker } = useParams();
  const [indexData, setIndexData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedRange, setSelectedRange] = useState('1y'); // Default to 1 year
  const [maPeriod, setMaPeriod] = useState(50); // State for selected MA period, default to 50
  const [showPrice, setShowPrice] = useState(true); // State to control Price line visibility
  const [showMa, setShowMa] = useState(true); // State to control MA line visibility

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
            case 'max':
              setMaPeriod(200); // No default MA for max range
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
    const interval = setInterval(fetchIndexData, 5000); // Refresh every 4 seconds
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
    const maPeriodValue = maPeriod;
    let movingAverageData = [];
    if (!isNaN(maPeriodValue) && maPeriodValue > 0) {
      movingAverageData = calculateMovingAverage(prices, maPeriodValue);
    }

    const lastPrice = prices[prices.length - 1];
    const lastMovingAverage = movingAverageData[movingAverageData.length - 1];

    const isAboveMA = lastPrice > lastMovingAverage;

    const borderColor = isAboveMA ? '#5EE04A' : '#E04038'; // Green/Red hex codes
    const fillColor = isAboveMA ? 'rgba(182, 229, 175, 0.5)' : 'rgba(224, 82, 74, 0.5)'; // Lighter shade of line color with transparency

    return {
      labels: historicalData.map((d) => d.date),
      datasets: [
        ...(showPrice ? [{
          label: 'Price',
          data: prices,
          fill: true, // Fill the area under the line
          backgroundColor: fillColor, // Dynamic fill color
          borderColor: borderColor,
          tension: 0.1,
          pointRadius: 0,
        }] : []),
        ...(showMa && maPeriodValue !== null ? [{
          label: `${maPeriodValue}-Period MA`,
          data: movingAverageData,
          fill: false,
          borderColor: '#ADD8E6', // Lighter blue
          borderDash: [5, 5],
          tension: 0.1,
          pointRadius: 0,
        }] : []),
      ],
    };
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    if (range === 'max') {
      setMaPeriod(null); // No default MA for max range
    } else {
      setMaPeriod(50); // Reset to default 50-period MA for other ranges
    }
  };

  const handleMaPeriodChange = (value) => {
    setMaPeriod(parseInt(value));
  };

  

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            // context[0].label contains the date string
            return context[0].label;
          },
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
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
      <div className="chart-controls">
        <div className="radio-inputs">
          <label className="radio">
            <input type="radio" name="range" value="1d" checked={selectedRange === '1d'} onChange={() => handleRangeChange('1d')} />
            <span className="name">1D</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="5d" checked={selectedRange === '5d'} onChange={() => handleRangeChange('5d')} />
            <span className="name">5D</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="1mo" checked={selectedRange === '1mo'} onChange={() => handleRangeChange('1mo')} />
            <span className="name">1M</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="3mo" checked={selectedRange === '3mo'} onChange={() => handleRangeChange('3mo')} />
            <span className="name">3M</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="6mo" checked={selectedRange === '6mo'} onChange={() => handleRangeChange('6mo')} />
            <span className="name">6M</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="1y" checked={selectedRange === '1y'} onChange={() => handleRangeChange('1y')} />
            <span className="name">1Y</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="5y" checked={selectedRange === '5y'} onChange={() => handleRangeChange('5y')} />
            <span className="name">5Y</span>
          </label>
          <label className="radio">
            <input type="radio" name="range" value="max" checked={selectedRange === 'max'} onChange={() => handleRangeChange('max')} />
            <span className="name">MAX</span>
          </label>
        </div>
        <div className="chart-container">
          {historicalData.length > 0 && (
            <Line data={getChartData()} options={chartOptions} />
          )}
        </div>
        <div className="ma-controls">
          <div className="ma-dropdown-container">
            <label htmlFor="ma-select">Moving Average:</label>
            <select id="ma-select" onChange={(e) => handleMaPeriodChange(e.target.value)} value={maPeriod}>
              <option value="5">5-Period MA</option>
              <option value="10">10-Period MA</option>
              <option value="20">20-Period MA</option>
              <option value="50">50-Period MA</option>
              <option value="100">100-Period MA</option>
              <option value="200">200-Period MA</option>
            </select>
          </div>
          <div className="chart-checkboxes">
            <label>
              <input type="checkbox" checked={showPrice} onChange={() => setShowPrice(!showPrice)} />
              Show Price
            </label>
            <label>
              <input type="checkbox" checked={showMa} onChange={() => setShowMa(!showMa)} />
              Show Moving Average
            </label>
          </div>
        </div>
      </div>
      <div className="details-section">
        <h3>All Details:</h3>
        <table className="details-table">
          <tbody>
            {indexData.symbol && <tr><td><strong>Symbol:</strong></td><td>{indexData.symbol}</td></tr>}
            {(indexData.longName || indexData.symbol) && <tr><td><strong>Short Name:</strong></td><td>{indexData.longName || indexData.symbol}</td></tr>}
            {indexData.regularMarketPrice && <tr><td><strong>Current Price:</strong></td><td>{indexData.regularMarketPrice?.toFixed(2)}</td></tr>}
            <tr><td><strong>Change:</strong></td><td className={indexData.regularMarketChange >= 0 ? 'positive-change' : 'negative-change'}>{indexData.regularMarketChange}</td></tr>
            <tr><td><strong>Change Percent:</strong></td><td className={indexData.regularMarketChangePercent >= 0 ? 'positive-change' : 'negative-change'}>{indexData.regularMarketChangePercent}</td></tr>
            {indexData.regularMarketDayHigh && <tr><td><strong>Day High:</strong></td><td>{indexData.regularMarketDayHigh?.toFixed(2)}</td></tr>}
            {indexData.regularMarketDayLow && <tr><td><strong>Day Low:</strong></td><td>{indexData.regularMarketDayLow?.toFixed(2)}</td></tr>}
            {indexData.regularMarketPreviousClose && <tr><td><strong>Previous Close:</strong></td><td>{indexData.regularMarketPreviousClose?.toFixed(2)}</td></tr>}
            {indexData.regularMarketOpen && <tr><td><strong>Open:</strong></td><td>{indexData.regularMarketOpen?.toFixed(2)}</td></tr>}
            {indexData.regularMarketVolume !== undefined && indexData.regularMarketVolume !== null && indexData.regularMarketVolume !== 0 && <tr><td><strong>Volume:</strong></td><td>{indexData.regularMarketVolume?.toLocaleString()}</td></tr>}
            {indexData.marketState && <tr><td><strong>Market State:</strong></td><td>{indexData.marketState}</td></tr>}
            {indexData.exchange && <tr><td><strong>Exchange:</strong></td><td>{indexData.exchange}</td></tr>}
            {indexData.fullExchangeName && <tr><td><strong>Full Exchange Name:</strong></td><td>{indexData.fullExchangeName}</td></tr>}
            {indexData.currency && <tr><td><strong>Currency:</strong></td><td>{indexData.currency}</td></tr>}
            {indexData.gmtOffSetMilliseconds && <tr><td><strong>GMT Offset (ms):</strong></td><td>{indexData.gmtOffSetMilliseconds}</td></tr>}
            <tr><td><strong>Last Update Time:</strong></td><td>{new Date().toLocaleString()}</td></tr>
            {indexData.quoteType && <tr><td><strong>Quote Type:</strong></td><td>{indexData.quoteType}</td></tr>}
            {indexData.fiftyTwoWeekHigh && <tr><td><strong>52-Week High:</strong></td><td>{indexData.fiftyTwoWeekHigh?.toFixed(2)}</td></tr>}
            {indexData.fiftyTwoWeekLow && <tr><td><strong>52-Week Low:</strong></td><td>{indexData.fiftyTwoWeekLow?.toFixed(2)}</td></tr>}
            
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IndexDetailPage;