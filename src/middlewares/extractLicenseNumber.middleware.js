import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Tesseract from "tesseract.js"; // Replacing Google Vision with Tesseract

const extractLicenseDetails = asyncHandler(async (req, _, next) => {
    try {
        // Get the license picture
        const licenseLocalPath = req.files?.licenseImage?.[0]?.path;
        if (!licenseLocalPath) {
            throw new ApiError(
                401,
                "License Local Path not found during registration"
            );
        }

        // Upload it on Cloudinary
        const license = await uploadOnCloudinary(licenseLocalPath);
        if (!license) {
            throw new ApiError(
                500,
                "Failed to upload license on Cloudinary during registration"
            );
        }

        const imageUrl = license.url;

        if (!imageUrl) {
            throw new ApiError(400, "Image URL is required");
        }

        // Perform OCR using Tesseract
        const {
            data: { text: extractedText },
        } = await Tesseract.recognize(imageUrl, "eng");

        // Extract relevant fields using regex or text processing
        const fboMatch = extractedText.match(
            /Name and permanent address.*?:\s*(.*?)\n(?:Address|[\s\S])/i
        );
        const premisesMatch = extractedText.match(
            /Address of location.*?:\s*(.*?)\n(?:Kind|[\s\S])/i
        );
        const registrationNumberMatch = extractedText.match(
            /Registration Number: ~\s*(\d+)/
        );
        const issuedOnMatch = extractedText.match(
            /Issued On.*?:\s*([\d-]+\s[\d:]+)/i
        );
        const validUptoMatch = extractedText.match(
            /Valid Upto.*?:\s*([\d-]+)/i
        );

        // Build the userLicense object
        req.body.userLicense = {
            fbo: fboMatch ? fboMatch[1].trim() : null,
            premises: premisesMatch ? premisesMatch[1].trim() : null,
            registrationNumber: registrationNumberMatch
                ? registrationNumberMatch[1].trim()
                : null,
            issuedOn: issuedOnMatch ? issuedOnMatch[1].trim() : null,
            validUpto: validUptoMatch ? validUptoMatch[1].trim() : null,
            licenseImage: imageUrl,
        };

        next();
    } catch (error) {
        console.error("Error extracting license details:", error);
        throw new ApiError(500, "Failed to extract license details");
    }
});

export { extractLicenseDetails };
