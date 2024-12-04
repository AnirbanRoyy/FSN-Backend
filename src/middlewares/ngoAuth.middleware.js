import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Ngo } from "../models/ngo.model.js";

const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "Failed to fetch the access token")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await Ngo.findById(decodedToken._id).select("-password -refreshToken");
    
        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }
    
        req.ngo = user;
        next();
    } catch (error) {
        throw new ApiError(500, "Token Verification failed")
    }
})

export {verifyJWT}