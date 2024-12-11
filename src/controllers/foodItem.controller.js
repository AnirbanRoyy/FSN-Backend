import { FoodItem } from "../models/foodItem.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Controller to create a new food item
const createFoodItem = asyncHandler(async (req, res) => {
    const { donorId, description, quantity, expiryDate } = req.body;

    // Validate input
    if (
        [donorId, description, quantity, expiryDate].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Create the food item document
    const foodItem = await FoodItem.create({
        donorId,
        description,
        quantity,
        expiryDate,
    });

    // Send response
    return res
        .status(201)
        .json(new ApiResponse(200, foodItem, "Food item created successfully"));
});

export { createFoodItem };
