import React from 'react';
import '../styles/NotFound.css';
import FourZeroFourImage from '../assets/FourZeroFour.png';

const NotFound = () => {
  return (
    <div className="not-found-container">
      <img src={FourZeroFourImage} alt="404 Not Found" className="not-found-image" />
      <p className="not-found-message">Oops! The page you're looking for doesn't exist.</p>
    </div>
  );
};

export default NotFound;