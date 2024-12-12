import { Router } from "express";
import { createFoodItem, getFoodItemsByDonor } from "../controllers/foodItem.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyFoodDonorJWT } from "../middlewares/foodDonorAuth.middleware.js";

const router = Router();

router.route("/add-food-item").post(upload.single("coverImage"), verifyFoodDonorJWT, createFoodItem);
router.route("/get-food-items-list").post(verifyFoodDonorJWT, getFoodItemsByDonor);

export default router;
