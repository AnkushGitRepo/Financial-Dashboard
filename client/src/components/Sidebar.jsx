import React, { useContext, useState, useEffect } from 'react';
import { 
  BarChart, PieChart, BarChart3, Wallet, LineChart, Globe, 
  DollarSign, Settings, ChevronRight, ChevronLeft, Home, LogIn, LogOut, Calendar
} from 'lucide-react';
import '../styles/Sidebar.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Context } from '../main';
import axios from 'axios';
import { toast } from 'react-toastify';

export function Sidebar({ isCollapsed, onToggle }) {
  const location = useLocation();
  const navigateTo = useNavigate();
  const { isAuthenticated, setIsAuthenticated, setUser } = useContext(Context);
  const [marketStatus, setMarketStatus] = useState('Loading market status...');
  const [timeRemaining, setTimeRemaining] = useState('');

  // Hardcoded Indian market holidays for 2025 (example, should be fetched from API in real app)
  const indianHolidays = [
    '2025-01-26', // Republic Day
    '2025-03-08', // Maha Shivaratri
    '2025-03-25', // Holi
    '2025-04-14', // Dr. Ambedkar Jayanti / Good Friday
    '2025-05-01', // Maharashtra Day
    '2025-08-15', // Independence Day
    '2025-10-02', // Gandhi Jayanti
    '2025-10-24', // Diwali (Laxmi Pujan)
    '2025-12-25', // Christmas
  ];

  const isHoliday = (date) => {
    const dateString = date.toISOString().slice(0, 10);
    return indianHolidays.includes(dateString);
  };

  const calculateMarketStatus = () => {
    const now = new Date();
    // Get current UTC time
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    // Create new Date object for IST (UTC + 5 hours 30 minutes)
    const istTime = new Date(utc + (330 * 60 * 1000));
    
    const dayOfWeek = istTime.getDay(); // Sunday - 0, Saturday - 6
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();

    const marketOpenHour = 9;
    const marketOpenMinute = 30;
    const marketCloseHour = 15; // 3 PM
    const marketCloseMinute = 30;

    // Check for weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setMarketStatus('Markets are Closed');
      setTimeRemaining('Weekend');
      return;
    }

    // Check for holidays
    if (isHoliday(now)) { // Use 'now' for holiday check as it's date-based
      setMarketStatus('Markets are Closed');
      setTimeRemaining('Holiday');
      return;
    }

    // Create Date objects for market open and close today in IST
    const marketOpenToday = new Date(now);
    marketOpenToday.setHours(marketOpenHour, marketOpenMinute, 0, 0);

    const marketCloseToday = new Date(now);
    marketCloseToday.setHours(marketCloseHour, marketCloseMinute, 0, 0);

    if (istTime >= marketOpenToday && istTime < marketCloseToday) {
      // Market is open
      setMarketStatus('Markets are Open');
      const timeDiff = marketCloseToday.getTime() - istTime.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      setTimeRemaining(`Closes in ${hours}h ${minutes}m ${seconds}s`);
    } else {
      // Market is closed
      setMarketStatus('Markets are Closed');
      let nextOpen = new Date(now);
      nextOpen.setHours(marketOpenHour, marketOpenMinute, 0, 0);

      // If current time is past today's closing, set next open to tomorrow
      if (istTime >= marketCloseToday) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }

      // Find next trading day
      while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6 || isHoliday(nextOpen)) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }

      const timeDiff = nextOpen.getTime() - istTime.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      setTimeRemaining(`Opens in ${hours}h ${minutes}m ${seconds}s`);
    }
  };

  useEffect(() => {
    const calculateHeight = () => {
      const sidebarBottom = document.querySelector('.sidebar-bottom');
      if (sidebarBottom) {
        const availableHeight = window.innerHeight - sidebarBottom.offsetTop;
        const authNav = document.querySelector('.auth-nav');
        if (authNav) {
          authNav.style.marginBottom = isCollapsed ? `${availableHeight - 100}px` : '0';
        }
      }
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, [isCollapsed]);

  useEffect(() => {
    calculateMarketStatus(); // Initial calculation
    const interval = setInterval(calculateMarketStatus, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  const mainNavItems = [
    { title: 'Dashboard', icon: Home, href: '/' },
    { title: 'Stocks', icon: BarChart, href: '/stocks' },
    { title: 'Markets', icon: BarChart3, href: '/markets' },
    { title: 'IPO Calendar', icon: Calendar, href: '/ipo-calendar' },
    { title: 'Portfolio', icon: Wallet, href: '/portfolio' },
  ];

  const settingsItem = { title: 'Settings', icon: Settings, href: '/settings' };

  const logout = async () => {
    await axios
      .get("http://localhost:4000/api/v1/user/logout", {
        withCredentials: true,
      })
      .then((res) => {
        toast.success(res.data.message);
        setUser(null);
        setIsAuthenticated(false);
        navigateTo("/auth");
      })
      .catch((err) => {
        toast.error(err.response.data.message);
      });
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className={`sidebar-title ${isCollapsed ? 'collapsed' : ''}`}>
          MarketMitra
        </h2>
        <button onClick={onToggle} className="sidebar-toggle">
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      <nav className="sidebar-nav main-nav">
        {mainNavItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={index}
              to={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <item.icon className="sidebar-link-icon" />
              <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <nav className="sidebar-nav settings-nav">
          <Link
            to={settingsItem.href}
            className={`sidebar-link ${location.pathname === settingsItem.href ? 'active' : ''}`}>
            <settingsItem.icon className="sidebar-link-icon" />
            <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
              {settingsItem.title}
            </span>
          </Link>
        </nav>

        <nav className="sidebar-nav auth-nav">
          {isAuthenticated ? (
            <button onClick={logout} className="sidebar-link">
              <LogOut className="sidebar-link-icon" />
              <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
                Logout
              </span>
            </button>
          ) : (
            <Link
              to="/auth"
              className={`sidebar-link ${location.pathname === '/auth' ? 'active' : ''}`}>
              <LogIn className="sidebar-link-icon" />
              <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
                Login / Register
              </span>
            </Link>
          )}
        </nav>

        <div className={`sidebar-hidden-content ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-footer">
            <div className="sidebar-footer-content">
              <p className="font-medium">Market Status</p>
              <p>{marketStatus}</p>
              <p className="text-xxs">{timeRemaining}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
