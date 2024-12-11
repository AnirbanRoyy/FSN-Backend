import { Router } from "express";
import { getNgoDeliveryHistory, startDelivery } from "../controllers/delivery.controller.js";

const router = Router();

router.route("/start-delivery").post(startDelivery);
router.route("/get-history").post(getNgoDeliveryHistory);

export default router;
