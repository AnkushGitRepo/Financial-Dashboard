import React from 'react';
import './PageLayout.css';

export const PageLayout = ({ title, children }) => {
  return (
    <div className="page-layout">
      {title && <h1 className="page-layout-title">{title}</h1>}
      <div className="page-layout-content">
        {children}
      </div>
    </div>
  );
};
