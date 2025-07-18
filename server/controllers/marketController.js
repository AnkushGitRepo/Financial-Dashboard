import yahooFinance from 'yahoo-finance2';
import { catchAsyncError } from '../middlewares/catchAsyncError.js';
import axios from 'axios';
import { indexes } from '../market/live_market.js';
import getLiveMarketData from '../market/live_market.js';
import { Stock } from '../models/stockModel.js';


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
      yahooFinance.quote(ticker, { validateResult: false })
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

export const searchIndianStocks = catchAsyncError(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return res.status(200).json({ success: true, stocks: [] });
  }

  try {
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search

    const stocks = await Stock.find({
      $or: [
        { "Security Code": searchRegex },
        { "Issuer Name": searchRegex },
        { "Security Id": searchRegex },
        { "Security Name": searchRegex },
      ],
    }).limit(10); // Limit to 10 results for recommendations

    res.status(200).json({
      success: true,
      stocks,
    });
  } catch (error) {
    console.error('Error searching Indian stocks:', error);
    return next(new Error('Failed to search Indian stocks', 500));
  }
});

export const getStockDetails = catchAsyncError(async (req, res, next) => {
  const { stockIdentifier } = req.params;

  try {
    const stockData = await Stock.findOne({
      $or: [
        { "Security Id": stockIdentifier },
        { "Yahoo Finance Ticker (NSE)": stockIdentifier },
        { "Yahoo Finance Ticker (BSE)": stockIdentifier },
      ],
    });

    if (!stockData) {
      return next(new Error('Stock not found', 404));
    }

    res.status(200).json({
      success: true,
      stockData,
    });
  } catch (error) {
    console.error('Error fetching stock details:', error);
    return next(new Error('Failed to fetch stock details', 500));
  }
});

export const getStocksData = catchAsyncError(async (req, res, next) => {
  const { tickers } = req.query; // tickers will be a comma-separated string

  if (!tickers) {
    return res.status(200).json({ success: true, stocksData: [] });
  }

  const tickerArray = tickers.split(',');

  try {
    const quotes = await Promise.all(
      tickerArray.map(ticker => yahooFinance.quote(ticker, { validateResult: false }))
    );

    const stocksData = quotes.map(quote => ({
      symbol: quote.symbol || null,
      longName: quote.longName || quote.shortName || quote.symbol || null,
      regularMarketPrice: quote.regularMarketPrice?.raw !== undefined ? quote.regularMarketPrice.raw : quote.regularMarketPrice || null,
      regularMarketChange: quote.regularMarketChange?.raw !== undefined ? quote.regularMarketChange.raw : quote.regularMarketChange || null,
      regularMarketChangePercent: quote.regularMarketChangePercent?.raw !== undefined ? quote.regularMarketChangePercent.raw : quote.regularMarketChangePercent || null,
      marketState: quote.marketState || null,
    }));

    res.status(200).json({
      success: true,
      stocksData,
    });
  } catch (error) {
    console.error('Error fetching stocks data:', error);
    return next(new Error('Failed to fetch stocks data', 500));
  }
});

export const getHistoricalStockData = catchAsyncError(async (req, res, next) => {
  const { ticker: stockIdentifier } = req.params; // Rename ticker to stockIdentifier for clarity
  const { range } = req.query;

  try {
    // First, get the stock details from your database to find the Yahoo Finance ticker
    const stockData = await Stock.findOne({
      $or: [
        { "Security Id": stockIdentifier },
        { "Yahoo Finance Ticker (NSE)": stockIdentifier },
        { "Yahoo Finance Ticker (BSE)": stockIdentifier },
      ],
    });

    if (!stockData) {
      return next(new Error('Stock not found in database', 404));
    }

    // Determine the Yahoo Finance ticker to use
    const yahooTicker = stockData['Yahoo Finance Ticker (NSE)'] || stockData['Yahoo Finance Ticker (BSE)'];

    if (!yahooTicker) {
      return next(new Error('Yahoo Finance ticker not found for this stock', 404));
    }

    const { period1, period2 } = getDateRange(range);

    const queryOptions = {
      period1: period1.toISOString().split('T')[0],
      period2: period2.toISOString().split('T')[0],
    };

    // Fetch historical and current data in parallel using the yahooTicker
    const [historicalResult, quote] = await Promise.all([
      yahooFinance.historical(yahooTicker, queryOptions),
      yahooFinance.quote(yahooTicker, { validateResult: false })
    ]);

    // Format historical data
    const historical = historicalResult.map(item => ({
      date: item.date.toISOString().split('T')[0],
      price: item.close,
    }));

    const currentData = {
      symbol: quote.symbol || null,
      longName: quote.longName || quote.shortName || quote.symbol || null,
      regularMarketPrice: quote.regularMarketPrice?.raw !== undefined ? quote.regularMarketPrice.raw : quote.regularMarketPrice || null,
      regularMarketChange: quote.regularMarketChange?.raw !== undefined ? quote.regularMarketChange.raw : quote.regularMarketChange || null,
      regularMarketChangePercent: quote.regularMarketChangePercent?.raw !== undefined ? quote.regularMarketChangePercent.raw : quote.regularMarketChangePercent || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh?.raw !== undefined ? quote.fiftyTwoWeekHigh.raw : quote.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow?.raw !== undefined ? quote.fiftyTwoWeekLow.raw : quote.fiftyTwoWeekLow || null,
      regularMarketDayHigh: quote.regularMarketDayHigh?.raw !== undefined ? quote.regularMarketDayHigh.raw : quote.regularMarketDayHigh || null,
      regularMarketDayLow: quote.regularMarketDayLow?.raw !== undefined ? quote.regularMarketDayLow.raw : quote.regularMarketDayLow || null,
      regularMarketPreviousClose: quote.regularMarketPreviousClose?.raw !== undefined ? quote.regularMarketPreviousClose.raw : quote.regularMarketPreviousClose || null,
      regularMarketOpen: quote.regularMarketOpen?.raw !== undefined ? quote.regularMarketOpen.raw : quote.regularMarketOpen || null,
      regularMarketVolume: quote.regularMarketVolume?.raw !== undefined ? quote.regularMarketVolume.raw : quote.regularMarketVolume || null,
      marketState: quote.marketState || null,
      exchange: quote.exchange || null,
      fullExchangeName: quote.fullExchangeName || null,
      currency: quote.currency || null,
      gmtOffSetMilliseconds: quote.gmtOffSetMilliseconds?.raw !== undefined ? quote.gmtOffSetMilliseconds.raw : quote.gmtOffSetMilliseconds || null,
      quoteType: quote.quoteType || null,
    };

    res.status(200).json({
      success: true,
      data: {
        current: currentData,
        historical: historical,
      },
    });
  } catch (error) {
    console.error(`Error fetching data for ${stockIdentifier}:`, error);
    return next(new Error(`Failed to fetch data for ${stockIdentifier}`, 500));
  }
});

