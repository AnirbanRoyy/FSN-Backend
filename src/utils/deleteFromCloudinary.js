import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "./asyncHandler.js";
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getPublicIdFromUrl(url) {
    // Regular expression to extract public_id, ignoring the version
    const regex = /upload\/(?:v\d+\/)?(.+)\.[a-z]+$/; // Matches optional "v<number>/" and gets the public_id without extension
    const match = url.match(regex);

    if (!match || match.length < 2) {
        throw new Error("Invalid Cloudinary URL");
    }

    return match[1]; // Return the public_id without file extension
}

const deleteFromCloudinary = asyncHandler(async (cloudinaryUrl) => {
    try {
        const publicId = getPublicIdFromUrl(cloudinaryUrl);

        // Delete resource using Cloudinary API
        await cloudinary.uploader.destroy(publicId);
        return;
    } catch (error) {
        throw new ApiError("Failed to delete old file")
    }
});

export { deleteFromCloudinary };
