import yahooFinance from 'yahoo-finance2';
import { catchAsyncError } from '../middlewares/catchAsyncError.js';
import axios from 'axios';

const getDateRange = (range) => {
  const today = new Date();
  let period1Date;

  switch (range) {
    case '1d':
      period1Date = new Date(today);
      period1Date.setDate(today.getDate() - 1);
      break;
    case '5d':
      period1Date = new Date(today);
      period1Date.setDate(today.getDate() - 5);
      break;
    case '1mo':
      period1Date = new Date(today);
      period1Date.setMonth(today.getMonth() - 1);
      break;
    case '3mo':
      period1Date = new Date(today);
      period1Date.setMonth(today.getMonth() - 3);
      break;
    case '6mo':
      period1Date = new Date(today);
      period1Date.setMonth(today.getMonth() - 6);
      break;
    case '1y':
      period1Date = new Date(today);
      period1Date.setFullYear(today.getFullYear() - 1);
      break;
    case '5y':
      period1Date = new Date(today);
      period1Date.setFullYear(today.getFullYear() - 5);
      break;
    case 'max':
      period1Date = new Date('1970-01-01'); // Unix epoch start date
      break;
    default:
      period1Date = new Date(today);
      period1Date.setFullYear(today.getFullYear() - 1); // Default to 1 year
  }

  return {
    period1: period1Date,
    period2: today,
  };
};

export const getHistoricalIndexData = catchAsyncError(async (req, res, next) => {
  const { ticker } = req.params;
  const { range = '1y' } = req.query; // Default to 1 year

  if (!ticker) {
    return next(new Error('Ticker symbol is required', 400));
  }

  try {
    const { period1, period2 } = getDateRange(range);
    const chartOptions = { period1: period1, period2: period2 };

    const chartResult = await yahooFinance.chart(ticker, chartOptions);

    if (!chartResult || !chartResult.quotes || chartResult.quotes.length === 0) {
      return next(new Error(`No data found for ticker: ${ticker} with range ${range}`, 404));
    }

    const historical = chartResult.quotes.map(quote => ({
      date: new Date(quote.date).toISOString().split('T')[0],
      price: quote.close,
    }));

    const currentQuote = chartResult.meta;

    res.status(200).json({
      success: true,
      data: {
        historical: historical,
        current: {
          symbol: currentQuote.symbol,
          longName: currentQuote.longName || currentQuote.symbol,
          regularMarketPrice: currentQuote.regularMarketPrice,
          regularMarketChange: currentQuote.chartPreviousClose ? (currentQuote.regularMarketPrice - currentQuote.chartPreviousClose) : null,
          regularMarketChangePercent: currentQuote.chartPreviousClose ? ((currentQuote.regularMarketPrice - currentQuote.chartPreviousClose) / currentQuote.chartPreviousClose) * 100 : null,
          fiftyTwoWeekHigh: currentQuote.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: currentQuote.fiftyTwoWeekLow,
          regularMarketOpen: currentQuote.regularMarketOpen,
          regularMarketDayHigh: currentQuote.regularMarketDayHigh,
          regularMarketDayLow: currentQuote.regularMarketDayLow,
          regularMarketPreviousClose: currentQuote.regularMarketPreviousClose,
          regularMarketVolume: currentQuote.regularMarketVolume,
          averageDailyVolume3Month: currentQuote.averageDailyVolume3Month,
          averageDailyVolume10Day: currentQuote.averageDailyVolume10Day,
          marketState: currentQuote.marketState,
          exchange: currentQuote.exchange,
          fullExchangeName: currentQuote.fullExchangeName,
          currency: currentQuote.currency,
          gmtOffSetMilliseconds: currentQuote.gmtOffSetMilliseconds,
          regularMarketTime: currentQuote.regularMarketTime,
          quoteType: currentQuote.quoteType,
          regularMarketSource: currentQuote.regularMarketSource || 'N/A', // regularMarketSource might not always be present
        },
      },
    });
  } catch (error) {
    console.error(`Error fetching data for ${ticker} with range ${range}:`, error);
    return next(new Error(`Failed to fetch data for ${ticker}: ${error.message}`, 500));
  }
});


