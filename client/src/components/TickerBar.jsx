import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from "framer-motion";
import '../styles/TickerBar.css';

function formatChange(change) {
    const roundedChange = parseFloat(change).toFixed(2);
    let className = "ticker-change";
    let arrow = "";
    let sign = "";
    if (roundedChange > 0) {
        className += " ticker-green";
        arrow = "▲";
        sign = "+";
    } else if (roundedChange < 0) {
        className += " ticker-red";
        arrow = "▼";
    } else {
        className += " ticker-neutral";
    }
    return (
        <span className={className}>
      {arrow} {sign}{roundedChange}%
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
    const [tickerData, setTickerData] = useState([]);
    const DURATION = 80;

    const popularTickers = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", 
        "BAJAJFINSV.NS", "BAJFINANCE.NS", "MARUTI.NS", "TATAMOTORS.NS", 
        "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "NTPC.NS", 
        "POWERGRID.NS", "COALINDIA.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS",
        "BHARTIARTL.NS", "ASIANPAINT.NS", "HINDUNILVR.NS", "ITC.NS", "LT.NS", "WIPRO.NS"
    ];

    useEffect(() => {
        const fetchTickerData = async () => {
            try {
                const { data } = await axios.get(`/api/v1/market/stocks/data?tickers=${popularTickers.join(',')}`);
                const formattedData = data.stocksData.map(stock => ({
                    symbol: stock.symbol.replace('.NS', ''),
                    price: stock.regularMarketPrice ? stock.regularMarketPrice.toFixed(2) : 'N/A',
                    change: stock.regularMarketChangePercent ? stock.regularMarketChangePercent.toFixed(2) : 0,
                }));
                setTickerData(formattedData);
            } catch (error) {
                console.error('Error fetching ticker data:', error);
            }
        };

        fetchTickerData();
        const interval = setInterval(fetchTickerData, 60000);
        return () => clearInterval(interval);
    }, []);

    if (tickerData.length === 0) {
        return null;
    }

    const scrollingData = [...tickerData, ...tickerData];

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