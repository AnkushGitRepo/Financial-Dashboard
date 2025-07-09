import React, { useContext } from 'react';
import { 
  BarChart, PieChart, BarChart3, Wallet, LineChart, Globe, 
  DollarSign, Settings, ChevronRight, ChevronLeft, Home, LogIn, LogOut
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

  const mainNavItems = [
    { title: 'Dashboard', icon: Home, href: '/' },
    { title: 'Stocks', icon: BarChart, href: '/stocks' },
    { title: 'Markets', icon: BarChart3, href: '/markets' },
    { title: 'Currencies', icon: DollarSign, href: '/currencies' },
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
              className={`sidebar-link ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
              <item.icon className="sidebar-link-icon" />
              <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      <nav className="sidebar-nav auth-nav">
        {isAuthenticated ? (
          <button onClick={logout} className={`sidebar-link ${isCollapsed ? 'collapsed' : ''}`}>
            <LogOut className="sidebar-link-icon" />
            <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
              Logout
            </span>
          </button>
        ) : (
          <Link
            to="/auth"
            className={`sidebar-link ${location.pathname === '/auth' ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
            <LogIn className="sidebar-link-icon" />
            <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
              Login / Register
            </span>
          </Link>
        )}
      </nav>

      <nav className="sidebar-nav settings-nav">
        <Link
          to={settingsItem.href}
          className={`sidebar-link ${location.pathname === settingsItem.href ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
          <settingsItem.icon className="sidebar-link-icon" />
          <span className={`sidebar-link-text ${isCollapsed ? 'collapsed' : ''}`}>
            {settingsItem.title}
          </span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className={`sidebar-footer-content ${isCollapsed ? 'collapsed' : ''}`}>
          <p className="font-medium">Market Status</p>
          <p>Markets are open</p>
          <p className="text-xxs">Closes in 3h 45m</p>
        </div>
      </div>
    </aside>
  );
}
