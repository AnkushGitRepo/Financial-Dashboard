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
  Filler,
} from 'chart.js';
import '../../src/styles/StockDetailPage.css';
import '../../src/styles/FinancialData.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StockDetailPage = () => {
  const { stockIdentifier } = useParams();
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  
  const [selectedRange, setSelectedRange] = useState('1y');
  const [maPeriod, setMaPeriod] = useState(50);
  const [showPrice, setShowPrice] = useState(true);
  const [showMa, setShowMa] = useState(true);
  const [stockNews, setStockNews] = useState([]);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const response = await axios.get(`/api/v1/market/stock/history/${stockIdentifier}?range=${selectedRange}`);
        setStockData(response.data.data.current);
        setHistoricalData(response.data.data.historical);

        if (maPeriod === null) {
          switch (selectedRange) {
            case '1d':
              setMaPeriod(5);
              break;
            case '5d':
              setMaPeriod(5);
              break;
            case '1mo':
              setMaPeriod(7);
              break;
            case '3mo':
              setMaPeriod(20);
              break;
            case '6mo':
              setMaPeriod(50);
              break;
            case '1y':
              setMaPeriod(50);
              break;
            case '5y':
              setMaPeriod(200);
              break;
            case 'max':
              setMaPeriod(200);
              break;
            default:
              setMaPeriod(50);
          }
        }

      } catch (error) {
        console.error(`Error fetching data for ${stockIdentifier} with range ${selectedRange}:`, error);
      }
    };

    const fetchFinancialData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5001/api/financial_data/${stockIdentifier.replace('.NS', '')}`);
        console.log('Financial Data API Response:', response.data);
        setFinancialData(response.data);
      } catch (error) {
        console.error(`Error fetching financial data for ${stockIdentifier}:`, error);
      }
    };

    fetchStockData();
    fetchFinancialData();

    const interval = setInterval(fetchStockData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [stockIdentifier, selectedRange, maPeriod]);

  useEffect(() => {
    const fetchStockNews = async () => {
      if (stockData?.longName) {
        try {
          const { data } = await axios.get(`/api/v1/market/sentiment-news?ticker_or_company=${encodeURIComponent(stockData.longName)}&max_articles=5`);
          setStockNews(data.articles || []);
        } catch (error) {
          console.error('Error fetching stock news:', error);
          setStockNews([]);
        }
      }
    };

    fetchStockNews();
  }, [stockIdentifier, stockData?.longName]);

  const calculateMovingAverage = (data, windowSize) => {
    const movingAverages = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        movingAverages.push(null);
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

    const borderColor = isAboveMA ? '#5EE04A' : '#E04038';
    const fillColor = isAboveMA ? 'rgba(182, 229, 175, 0.5)' : 'rgba(224, 82, 74, 0.5)';

    return {
      labels: historicalData.map((d) => d.date),
      datasets: [
        ...(showPrice ? [{
          label: 'Price',
          data: prices,
          fill: true,
          backgroundColor: fillColor,
          borderColor: borderColor,
          tension: 0.1,
          pointRadius: 0,
        }] : []),
        ...(showMa && maPeriodValue !== null ? [{
          label: `${maPeriodValue}-Period MA`,
          data: movingAverageData,
          fill: false,
          borderColor: '#ADD8E6',
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
      setMaPeriod(null);
    } else {
      setMaPeriod(50);
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

  if (!stockData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="index-detail-page-wrapper">
      <h2>{stockData.longName || stockData.symbol} Details</h2>
      <div className="index-summary">
        <p><strong>Current Price:</strong> {stockData.regularMarketPrice?.toFixed(2)}</p>
        <p className={stockData.regularMarketChange >= 0 ? 'positive-change' : 'negative-change'}>
          <strong>Change:</strong> {stockData.regularMarketChange?.toFixed(2)} ({stockData.regularMarketChangePercent?.toFixed(2)}%)
        </p>
        <p><strong>52-Week High:</strong> {stockData.fiftyTwoWeekHigh?.toFixed(2)}</p>
        <p><strong>52-Week Low:</strong> {stockData.fiftyTwoWeekLow?.toFixed(2)}</p>
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
      <div className="details-section">
        <h3>All Details:</h3>
          <table className="details-table">
            <tbody>
              {(stockData.longName || stockData.symbol) && <tr><td><strong>Short Name:</strong></td><td>{stockData.longName || stockData.symbol}</td></tr>}
              {stockData.regularMarketPrice && <tr><td><strong>Current Price:</strong></td><td>{stockData.regularMarketPrice?.toFixed(2)}</td></tr>}
              <tr><td><strong>Change:</strong></td><td className={stockData.regularMarketChange >= 0 ? 'positive-change' : 'negative-change'}>{stockData.regularMarketChange?.toFixed(2)}</td></tr>
              <tr><td><strong>Change Percent:</strong></td><td className={stockData.regularMarketChangePercent >= 0 ? 'positive-change' : 'negative-change'}>{stockData.regularMarketChangePercent?.toFixed(2)}%</td></tr>
              {stockData.regularMarketDayHigh && <tr><td><strong>Day High:</strong></td><td>{stockData.regularMarketDayHigh?.toFixed(2)}</td></tr>}
              {stockData.regularMarketDayLow && <tr><td><strong>Day Low:</strong></td><td>{stockData.regularMarketDayLow?.toFixed(2)}</td></tr>}
            </tbody>
          </table>
          <table className="details-table">
            <tbody>
              {stockData.regularMarketPreviousClose && <tr><td><strong>Previous Close:</strong></td><td>{stockData.regularMarketPreviousClose?.toFixed(2)}</td></tr>}
              {stockData.regularMarketOpen && <tr><td><strong>Open:</strong></td><td>{stockData.regularMarketOpen?.toFixed(2)}</td></tr>}
              {stockData.regularMarketVolume !== undefined && stockData.regularMarketVolume !== null && stockData.regularMarketVolume !== 0 && <tr><td><strong>Volume:</strong></td><td>{stockData.regularMarketVolume?.toLocaleString()}</td></tr>}
              <tr><td><strong>Last Update Time:</strong></td><td>{new Date().toLocaleString()}</td></tr>
              {stockData.fiftyTwoWeekHigh && <tr><td><strong>52-Week High:</strong></td><td>{stockData.fiftyTwoWeekHigh?.toFixed(2)}</td></tr>}
              {stockData.fiftyTwoWeekLow && <tr><td><strong>52-Week Low:</strong></td><td>{stockData.fiftyTwoWeekLow?.toFixed(2)}</td></tr>}
            </tbody>
          </table>
      </div>
      </div>
    

      

      {financialData && (
        <section className="financial-data-section">
          <h2>Financial Data</h2>

          {financialData['balance-sheet'] && (
            <div className="financial-table-container">
              <h3>Balance Sheet</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['balance-sheet'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['balance-sheet'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {financialData['profit-loss'] && (
            <div className="financial-table-container">
              <h3>Profit & Loss</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['profit-loss'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['profit-loss'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {financialData['cashflow'] && (
            <div className="financial-table-container">
              <h3>Cashflow</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['cashflow'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['cashflow'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {financialData['ratios'] && (
            <div className="financial-table-container">
              <h3>Ratios</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['ratios'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['ratios'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {financialData['quarters'] && (
            <div className="financial-table-container">
              <h3>Quarters</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['quarters'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['quarters'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {financialData['shareholding'] && (
            <div className="financial-table-container">
              <h3>Shareholding</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['shareholding'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['shareholding'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {financialData['peers'] && (
            <div className="financial-table-container">
              <h3>Peers</h3>
              <div className="table-scroll-wrapper">
                <table className="financial-table">
                  <thead>
                    <tr>
                      {financialData['peers'].headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData['peers'].rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="stock-news-section">
        <h2>Latest Stock News</h2>
        {stockNews.length > 0 ? (
          <div className="news-list">
            {stockNews.map((article, index) => (
              <div key={index} className="news-card">
                {article.image_url && <img src={article.image_url} alt="Article Thumbnail" className="news-thumbnail" />}
                <div className="news-card-content">
                  <h3><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h3>
                  <p>{article.description}</p>
                  <div className="news-meta">
                    <span className="news-source">{article.source.name}</span>
                    <span className={`news-sentiment ${article.sentiment.toLowerCase()}`}>{article.sentiment}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No news available for this stock.</p>
        )}
      </section>
    </div>
  );
};

export default StockDetailPage;
