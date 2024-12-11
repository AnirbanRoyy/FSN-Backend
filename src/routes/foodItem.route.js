import { Router } from "express";
import { createFoodItem } from "../controllers/foodItem.controller";

const router = Router();

router.route("/add-food-item").post(createFoodItem);

export default router;
