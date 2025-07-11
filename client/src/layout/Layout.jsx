import React, { useState, useContext } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Context } from '../main';

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isAuthenticated } = useContext(Context);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (isAuthenticated === false && location.pathname !== '/') {
    return <Navigate to="/auth" />;
  }

  return (
    <>
      <Navbar />
      <div className={`layout-container ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;
