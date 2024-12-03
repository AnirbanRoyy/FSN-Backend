import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { FoodDonor } from "../models/foodDonor.model.js";

const verifyFoodDonorJWT = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization").replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Failed to fetch the access token");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await FoodDonor.findById(decodedToken._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.foodDonor = user;
        next();
    } catch (error) {
        throw new ApiError(500, "Token Verification failed");
    }
});

export { verifyFoodDonorJWT as verifyJWT };
