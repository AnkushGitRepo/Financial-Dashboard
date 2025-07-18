import yahooFinance from 'yahoo-finance2';

export const indexes = [
  { symbol: 'NIFTY 50', ticker: '^NSEI', type: 'indian' },
  { symbol: 'SENSEX', ticker: '^BSESN', type: 'indian' },
  { symbol: 'NIFTY BANK', ticker: '^NSEBANK', type: 'indian' },
  { symbol: 'NIFTY IT', ticker: '^CNXIT', type: 'indian' },
  { symbol: 'NIFTY FMCG', ticker: '^CNXFMCG', type: 'indian' },
  { symbol: 'NIFTY PHARMA', ticker: '^CNXPHARMA', type: 'indian' },
  { symbol: 'NIFTY AUTO', ticker: '^CNXAUTO', type: 'indian' },
  { symbol: 'NIFTY METAL', ticker: '^CNXMETAL', type: 'indian' },
  { symbol: 'NIFTY ENERGY', ticker: '^CNXENERGY', type: 'indian' },
  { symbol: 'NIFTY REALTY', ticker: '^CNXREALTY', type: 'indian' },
  { symbol: 'NIFTY MEDIA', ticker: '^CNXMEDIA', type: 'indian' },
  { symbol: 'NIFTY PSE', ticker: '^CNXPSE', type: 'indian' },
  { symbol: 'NIFTY PSU BANK', ticker: '^CNXPSUBANK', type: 'indian' },
  { symbol: 'NIFTY CONSUMPTION', ticker: '^CNXCONSUM', type: 'indian' },
  { symbol: 'NIFTY INFRASTRUCTURE', ticker: '^CNXINFRA', type: 'indian' },

  // ---- Global Benchmarks (unchanged) ----
  { symbol: 'S&P 500', ticker: '^GSPC', type: 'global' },
  { symbol: 'Dow Jones Industrial Average', ticker: '^DJI', type: 'global' },
  { symbol: 'Nasdaq Composite', ticker: '^IXIC', type: 'global' },
  { symbol: 'Russell 2000', ticker: '^RUT', type: 'global' },
  { symbol: 'FTSE 100', ticker: '^FTSE', type: 'global' },
  { symbol: 'Nikkei 225', ticker: '^N225', type: 'global' },
  { symbol: 'Hang Seng', ticker: '^HSI', type: 'global' },
  { symbol: 'Shanghai Composite', ticker: '000001.SS', type: 'global' },
  { symbol: 'DAX', ticker: '^GDAXI', type: 'global' },
  { symbol: 'CAC 40', ticker: '^FCHI', type: 'global' },
  { symbol: 'ASX 200', ticker: '^AXJO', type: 'global' },
  { symbol: 'EURO STOXX 50', ticker: '^STOXX50E', type: 'global' },
];


const getLiveMarketData = async () => {
  try {
    const marketData = await Promise.all(
      indexes.map(async (index) => {
        const result = await yahooFinance.quote(index.ticker);
        if (!result) {
          console.warn(`No data found for ticker: ${index.ticker}`);
          return null; // Or handle as appropriate for your application
        }
        // console.log(result);
        return {
          symbol: index.symbol,
          ticker: index.ticker,
          price: result.regularMarketPrice,
          change: result.regularMarketChange,
          changePercent: result.regularMarketChangePercent,
          // Add other relevant data points as needed
        };
      })
    );
    return marketData;
  } catch (error) {
    console.error('Error fetching live market data:', error);
    return [];
  }
};

export default getLiveMarketData;
