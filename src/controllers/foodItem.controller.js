import { FoodItem } from "../models/foodItem.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Controller to create a new food item
const createFoodItem = asyncHandler(async (req, res) => {
    const { description, quantity } = req.body;

    // Validate input
    if ([description, quantity].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // get the coverImage
    const coverImageLocalPath = req.file?.path;
    console.log(req.file);

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
        donorId: req.foodDonor._id,
        description,
        quantity,
        coverImage: coverImage.url,
    });

    if (!foodItem) {
        throw new ApiError(
            500,
            "Failed to create food item during registration"
        );
    }

    // Send response
    return res
        .status(201)
        .json(new ApiResponse(200, foodItem, "Food item created successfully"));
});

const getFoodItemsByDonor = asyncHandler(async (req, res) => {
    const donorId = req.foodDonor._id;

    // Validate donorId
    if (!donorId) {
        throw new ApiError(400, "Donor ID is required");
    }

    // Fetch food items by donor ID
    const foodItems = await FoodItem.find({ donorId });

    // Check if any food items exist
    if (!foodItems.length) {
        throw new ApiError(404, "No food items found for the specified donor");
    }

    // Send response
    return res
        .status(200)
        .json(
            new ApiResponse(200, foodItems, "Food items fetched successfully")
        );
});

export { createFoodItem, getFoodItemsByDonor };
