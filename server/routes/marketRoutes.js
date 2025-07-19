import express from 'express';
import { getHistoricalIndexData, getAllMarketIndices, getGlobalNews, searchIndianStocks, getStockDetails, getHistoricalStockData, getStocksData, getSentimentNews } from '../controllers/marketController.js';

const router = express.Router();

router.route('/indices/:ticker').get(getHistoricalIndexData);
router.route('/all-indices').get(getAllMarketIndices);
router.route('/global-news').get(getGlobalNews);
router.route('/stocks/search').get(searchIndianStocks);
router.route('/stock/:stockIdentifier').get(getStockDetails);
router.route('/stock/history/:ticker').get(getHistoricalStockData);
router.route('/stocks/data').get(getStocksData);
router.route('/sentiment-news').get(getSentimentNews);


export default router;