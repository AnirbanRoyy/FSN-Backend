// src/routes/travelInfo.route.js
import { Router } from 'express';
import { getGeocode, getTravelInfo, optimizeRoute } from '../controllers/maps.controller.js';

const router = Router();

router.route('/get-travel-info').post(getTravelInfo);
router.route('/get-geocode').get(getGeocode);
router.route('/optimize-route').post(optimizeRoute);

export default router;
