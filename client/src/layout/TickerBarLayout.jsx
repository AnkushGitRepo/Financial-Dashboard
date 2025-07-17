import React from 'react';
import { useLocation } from 'react-router-dom';
import { TickerBar } from '../components/TickerBar';

const TickerBarLayout = () => {
  const location = useLocation();
  const authRoutes = ['/auth', '/password/forgot', '/otp-verification', '/password/reset'];

  const shouldShowTickerBar = !authRoutes.some(route => location.pathname.startsWith(route));

  return shouldShowTickerBar ? <TickerBar /> : null;
};

export default TickerBarLayout;
