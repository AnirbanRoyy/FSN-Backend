import { FoodItem } from "../models/foodItem.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Controller to create a new food item
const createFoodItem = asyncHandler(async (req, res) => {
    const { donorId, description, quantity } = req.body;

    // Validate input
    if (
        [donorId, description, quantity].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // get the coverImage
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(
            401,
            "coverImage Local Path not found during registration"
        );
    }

    // upload them on Cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
        throw new ApiError(
            500,
            "Failed to upload coverImage on Cloudinary during registration"
        );
    }

    // Create the food item document
    const foodItem = await FoodItem.create({
        donorId,
        description,
        quantity,
        coverImage: coverImage.url,
    });

    // Send response
    return res
        .status(201)
        .json(new ApiResponse(200, foodItem, "Food item created successfully"));
});

export { createFoodItem };
