import express from 'express';
import { getHistoricalIndexData } from '../controllers/marketController.js';

const router = express.Router();

router.route('/indices/:ticker').get(getHistoricalIndexData);


export default router;