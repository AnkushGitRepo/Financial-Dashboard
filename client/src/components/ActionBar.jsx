import React, { useContext } from 'react';
import { 
  BarChart, PieChart, BarChart3, Wallet, LineChart, Globe, 
  DollarSign, Settings, Home, LogIn, Calendar
} from 'lucide-react';
import '../styles/ActionBar.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Context } from '../main';
import axios from 'axios';
import { toast } from 'react-toastify';

export function ActionBar() {
  const location = useLocation();
  const navigateTo = useNavigate();
  const { isAuthenticated, setIsAuthenticated, setUser } = useContext(Context);

  const mainNavItems = [
    { title: 'Dashboard', icon: Home, href: '/' },
    { title: 'Stocks', icon: BarChart, href: '/stocks' },
    { title: 'Markets', icon: BarChart3, href: '/markets' },
    { title: 'IPO Calendar', icon: Calendar, href: '/ipo-calendar' },
    { title: 'Global', icon: Globe, href: '/global' },
    { title: 'Portfolio', icon: Wallet, href: '/portfolio' },
    { title: 'Performance', icon: LineChart, href: '/performance' },
    { title: 'Analysis', icon: PieChart, href: '/analysis' },
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
    <div className="action-bar">
      <nav className="action-bar-nav">
        {!isAuthenticated ? (
          <Link
            to="/auth"
            className={`action-bar-link ${location.pathname === '/auth' ? 'active' : ''}`}
            data-tooltip="Login / Register"
          >
            <LogIn className="action-bar-icon" />
            <span className="action-bar-text">Sign Up / Sign In</span>
          </Link>
        ) : (
          <>
            {mainNavItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={index}
                  to={item.href}
                  className={`action-bar-link ${isActive ? 'active' : ''}`}
                  data-tooltip={item.title}
                >
                  <item.icon className="action-bar-icon" />
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}
