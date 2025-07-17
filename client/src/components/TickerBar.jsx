import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from "framer-motion";
import '../styles/TickerBar.css';

const tickerData = [
    { symbol: "INANCE", price: 921.75, change: -0.72 },
    { symbol: "BHARTIARTL", price: 1936.6, change: 0.12 },
    { symbol: "HDFCBANK", price: 1996.3, change: 0.04 },
    { symbol: "HINDUNILVR", price: 2517.6, change: -0.37 },
    { symbol: "INDIGO", price: 5950, change: 0.33 },
    { symbol: "ITC", price: 424.6, change: 0.59 },
    { symbol: "MARUTI", price: 12564, change: 0.22 },
    { symbol: "RELIANCE", price: 1485.6, change: 0.01 },
    { symbol: "SBIN", price: 831.7, change: 1.87 },
    { symbol: "TCS", price: 3231, change: 0 },
];

function formatChange(change) {
    let className = "ticker-change";
    let arrow = "";
    let sign = "";
    if (change > 0) {
        className += " ticker-green";
        arrow = "▲";
        sign = "+";
    } else if (change < 0) {
        className += " ticker-red";
        arrow = "▼";
    } else {
        className += " ticker-neutral";
    }
    return (
        <span className={className}>
      {arrow} {sign}{change}%
    </span>
    );
}

function TickerItem({ symbol, price, change }) {
    return (
        <div className="ticker-item">
            <span className="ticker-symbol">{symbol}</span>
            <span className="ticker-price">{price}</span>
            {formatChange(change)}
        </div>
    );
}

export function TickerBar() {
    const scrollingData = [...tickerData, ...tickerData];
    const DURATION = 30; // seconds

    return (
        <div className="ticker-bar">
            <motion.div
                className="ticker-track"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: DURATION,
                }}
            >
                {scrollingData.map((item, i) => (
                    <TickerItem key={i} {...item} />
                ))}
            </motion.div>
        </div>
    );
}