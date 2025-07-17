import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../styles/IpoCalendar.css';

const IpoCalendar = () => {
  const [ipoData, setIpoData] = useState([]);
  const [filteredIpoData, setFilteredIpoData] = useState([]);
  const [searchedIpoData, setSearchedIpoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('All'); // 'All', 'Mainboard', 'SME'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchIpoData = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/v1/user/ipo-data', {
          withCredentials: true,
        });

        // Sort by Open date in descending order
        const sortedData = response.data.ipoData.sort((a, b) => {
          return new Date(b.Open) - new Date(a.Open);
        });

        setIpoData(sortedData);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
        toast.error('Failed to fetch IPO data.');
      }
    };

    fetchIpoData();
  }, []);

  useEffect(() => {
    let currentData = ipoData;
    if (filterType === 'Mainboard') {
      currentData = ipoData.filter(ipo => !ipo["Company Name"].includes("SME")); // Assuming SME IPOs have "SME" in their name
    } else if (filterType === 'SME') {
      currentData = ipoData.filter(ipo => ipo["Company Name"].includes("SME")); // Assuming SME IPOs have "SME" in their name
    }
    setFilteredIpoData(currentData);
  }, [ipoData, filterType]);

  useEffect(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const searchResults = filteredIpoData.filter(ipo =>
        ipo["Company Name"].toLowerCase().includes(lowerCaseSearchTerm)
    );
    setSearchedIpoData(searchResults);
  }, [filteredIpoData, searchTerm]);

  if (loading) {
    return <div className="ipo-calendar-container">Loading IPO data...</div>;
  }

  if (error) {
    return <div className="ipo-calendar-container">Error: {error.message}</div>;
  }

  const getRowClass = (ipo) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

    const openDate = new Date(ipo.Open);
    openDate.setHours(0, 0, 0, 0);
    const closeDate = new Date(ipo.Close);
    closeDate.setHours(0, 0, 0, 0);
    const listingDate = new Date(ipo["Listing Date"]);
    listingDate.setHours(0, 0, 0, 0);

    const premium = parseFloat(ipo.Premium);

    // If IPO date is between open and close
    if (today >= openDate && today <= closeDate) {
      return 'ipo-status-open';
    }

    // If IPO is not listed and closed (i.e., close date has passed but listing date has not)
    if (today > closeDate && today < listingDate) {
      return 'ipo-status-closed-not-listed';
    }

    // If listing date has passed
    if (today > listingDate) {
      return 'ipo-status-listed';
    }

    // If IPO is not open but has a premium greater than 20%
    if (today < openDate && premium > 20) {
      return 'ipo-status-high-premium';
    }

    return ''; // Default no special class
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const trimCompanyName = (name) => {
    return name.replace('(TENTATIVE DATES)', '').trim();
  };

  const getRecommendation = (ipo) => {
    // Extract premium percentage from string like "14 (3.4%)"
    const premiumMatch = ipo.Premium.match(/\((\d+\.?\d*)%\)/);
    const premium = premiumMatch ? parseFloat(premiumMatch[1]) : parseFloat(ipo.Premium);

    const isSME = ipo["Company Name"].includes("SME");

    if (isSME) {
      // SME IPOs
      if (premium > 40) return 'Must Apply';
      if (premium >= 30 && premium < 40) return 'Apply'; // Between 30% and 40% (exclusive of 40%)
      if (premium >= 20 && premium < 30) return 'May Apply'; // Between 20% and 30% (exclusive of 30%)
      return 'Not Apply'; // Less than 20%
    } else {
      // Mainboard IPOs
      if (premium > 40) return 'Must Apply';
      if (premium >= 20 && premium < 40) return 'Apply'; // Between 20% and 40% (exclusive of 40%)
      if (premium >= 10 && premium < 20) return 'May Apply'; // Between 10% and 20% (exclusive of 20%)
      return 'Not Apply'; // Less than 10%
    }
  };

  const getRecommendationCellClass = (recommendation) => {
    switch (recommendation) {
      case 'Must Apply':
        return 'recommendation-must-apply';
      case 'Apply':
        return 'recommendation-apply';
      case 'May Apply':
        return 'recommendation-may-apply';
      case 'Not Apply':
        return 'recommendation-not-apply';
      default:
        return '';
    }
  };

  return (
      <div className="ipo-calendar-container">
        <div className="ipo-calendar-header">
          <h1>IPO Calendar</h1>
        </div>
        <div className="ipo-controls">
          <div className="ipo-filter-buttons">
            <button
                className={`filter-button ${filterType === 'All' ? 'active' : ''}`}
                onClick={() => handleFilterChange('All')}
            >
              All
            </button>
            <button
                className={`filter-button ${filterType === 'Mainboard' ? 'active' : ''}`}
                onClick={() => handleFilterChange('Mainboard')}
            >
              Mainboard
            </button>
            <button
                className={`filter-button ${filterType === 'SME' ? 'active' : ''}`}
                onClick={() => handleFilterChange('SME')}
            >
              SME
            </button>
          </div>
          <div className="ipo-search-bar">
            <input
                type="text"
                placeholder="Search by company name..."
                value={searchTerm}
                onChange={handleSearchChange}
            />
          </div>
        </div>
        {searchedIpoData.length > 0 ? (
            <div className="table-responsive">
              <table className="ipo-table">
                <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Premium</th>
                  <th>Open Date</th>
                  <th>Close Date</th>
                  <th>Price</th>
                  <th>Lot Size</th>
                  <th>Allotment Date</th>
                  <th>Listing Date</th>
                  <th>Recommendation</th>
                </tr>
                </thead>
                <tbody>
                {searchedIpoData.map((ipo, index) => {
                  const recommendation = getRecommendation(ipo);
                  return (
                      <tr key={index} className={getRowClass(ipo)}>
                        <td>{trimCompanyName(ipo["Company Name"])}</td>
                        <td>{ipo.Premium.match(/^.*\)/) ? ipo.Premium.match(/^.*\)/)[0] : ipo.Premium}</td>
                        <td>{new Date(ipo.Open).toLocaleDateString()}</td>
                        <td>{new Date(ipo.Close).toLocaleDateString()}</td>
                        <td>{ipo.Price}</td>
                        <td>{ipo["Lot Size"]}</td>
                        <td>{new Date(ipo["Allotment Date"]).toLocaleDateString()}</td>
                        <td>{new Date(ipo["Listing Date"]).toLocaleDateString()}</td>
                        <td className={getRecommendationCellClass(recommendation)}>{recommendation}</td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
        ) : (
            <p>No IPO data available for the selected filter and search term.</p>
        )}
      </div>
  );
};

export default IpoCalendar;