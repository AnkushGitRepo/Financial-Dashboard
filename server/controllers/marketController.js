import yahooFinance from 'yahoo-finance2';
import { catchAsyncError } from '../middlewares/catchAsyncError.js';
import axios from 'axios';
import { indexes } from '../market/live_market.js';
import getLiveMarketData from '../market/live_market.js';


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

export const getAllMarketIndices = catchAsyncError(async (req, res, next) => {
  try {
    const allMarketData = await getLiveMarketData();

    const indianIndices = allMarketData.filter(index =>
      indexes.find(i => i.ticker === index.ticker && i.type === 'indian')
    );
    const globalIndices = allMarketData.filter(index =>
      indexes.find(i => i.ticker === index.ticker && i.type === 'global')
    );

    res.status(200).json({
      success: true,
      indianIndices,
      globalIndices,
    });
  } catch (error) {
    console.error('Error fetching all market indices:', error);
    return next(new Error('Failed to fetch market indices', 500));
  }
});

export const getHistoricalIndexData = catchAsyncError(async (req, res, next) => {
  const { ticker } = req.params;
  const { range } = req.query;

  try {
    const { period1, period2 } = getDateRange(range);

    const queryOptions = {
      period1: period1.toISOString().split('T')[0],
      period2: period2.toISOString().split('T')[0],
    };

    // Fetch historical and current data in parallel
    const [historicalResult, quote] = await Promise.all([
      yahooFinance.historical(ticker, queryOptions),
      yahooFinance.quote(ticker)
    ]);

    // Format historical data
    const historical = historicalResult.map(item => ({
      date: item.date.toISOString().split('T')[0],
      price: item.close,
    }));

    res.status(200).json({
      success: true,
      data: {
        current: quote,
        historical: historical,
      },
    });
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return next(new Error(`Failed to fetch data for ${ticker}`, 500));
  }
});

export const getGlobalNews = catchAsyncError(async (req, res, next) => {
  try {
    const result = await yahooFinance.search('global markets');
    const articles = result.news.slice(0, 10).map(article => ({
      url: article.link,
      urlToImage: article.thumbnail?.resolutions[0]?.url || null,
      title: article.title,
      description: null, // Yahoo Finance search doesn't provide descriptions
      source: { name: article.publisher }
    }));

    res.status(200).json({
      success: true,
      articles: articles,
    });
  } catch (error) {
    console.error('Error fetching global news:', error);
    return next(new Error('Failed to fetch global news', 500));
  }
});


