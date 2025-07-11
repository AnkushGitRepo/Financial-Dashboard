import React, { useState, useContext, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { ActionBar } from '../components/ActionBar';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Context } from '../main';

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isAuthenticated } = useContext(Context);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
        {!isMobile && (
          <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        )}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      {isMobile && <ActionBar />}
    </>
  );
};

export default Layout;
