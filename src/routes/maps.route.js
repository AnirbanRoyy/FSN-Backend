// src/routes/travelInfo.route.js
import { Router } from 'express';
import { getTravelInfo } from '../controllers/maps.controller.js';

const router = Router();

router.route('/get-travel-info').post(getTravelInfo);

export default router;
