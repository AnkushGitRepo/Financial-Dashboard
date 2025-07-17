import yahooFinance from 'yahoo-finance2';

const indexes = [
  { symbol: 'NIFTY 50', ticker: '^NSEI' },
  { symbol: 'SENSEX', ticker: '^BSESN' },
  { symbol: 'NIFTY BANK', ticker: '^NSEBANK' },
  { symbol: 'NIFTY IT', ticker: '^CNXIT' },
  { symbol: 'NIFTY FMCG', ticker: '^CNXFMCG' },
  { symbol: 'NIFTY PHARMA', ticker: '^CNXPHARMA' },
  { symbol: 'NIFTY AUTO', ticker: '^CNXAUTO' },
  { symbol: 'NIFTY METAL', ticker: '^CNXMETAL' },
  { symbol: 'NIFTY ENERGY', ticker: '^CNXENERGY' },
  { symbol: 'NIFTY REALTY', ticker: '^CNXREALTY' },
  { symbol: 'NIFTY MEDIA', ticker: '^CNXMEDIA' },
  { symbol: 'NIFTY PSE', ticker: '^CNXPSE' },
  { symbol: 'NIFTY PSU BANK', ticker: '^CNXPSUBANK' },
  { symbol: 'NIFTY CONSUMPTION', ticker: '^CNXCONSUM' },
  { symbol: 'NIFTY INFRASTRUCTURE', ticker: '^CNXINFRA' },

  // ---- Global Benchmarks (unchanged) ----
  { symbol: 'S&P 500', ticker: '^GSPC' },
  { symbol: 'Dow Jones Industrial Average', ticker: '^DJI' },
  { symbol: 'Nasdaq Composite', ticker: '^IXIC' },
  { symbol: 'Russell 2000', ticker: '^RUT' },
  { symbol: 'FTSE 100', ticker: '^FTSE' },
  { symbol: 'Nikkei 225', ticker: '^N225' },
  { symbol: 'Hang Seng', ticker: '^HSI' },
  { symbol: 'Shanghai Composite', ticker: '000001.SS' },
  { symbol: 'DAX', ticker: '^GDAXI' },
  { symbol: 'CAC 40', ticker: '^FCHI' },
  { symbol: 'ASX 200', ticker: '^AXJO' },
  { symbol: 'EURO STOXX 50', ticker: '^STOXX50E' },
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
