import express from 'express';
import { getHistoricalIndexData, getAllMarketIndices, getGlobalNews } from '../controllers/marketController.js';

const router = express.Router();

router.route('/indices/:ticker').get(getHistoricalIndexData);
router.route('/all-indices').get(getAllMarketIndices);
router.route('/global-news').get(getGlobalNews);


export default router;