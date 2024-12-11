// src/controllers/maps.controller.js
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuidv4 } from "uuid";

const getTravelInfo = asyncHandler(async (req, res) => {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
        throw new ApiError(400, "Origin and destination are required");
    }

    try {
        // Generate a unique request id
        const uniqueRequestId = uuidv4();

        // API key from environment variables
        const apiKey = process.env.OLA_MAPS_API_KEY;

        // Construct the URL with query parameters
        const url = `https://api.olamaps.io/routing/v1/directions?origin=${origin}&destination=${destination}&api_key=${apiKey}`;

        // Make the POST request
        const response = await axios.post(
            url,
            {},
            {
                headers: {
                    "X-Request-Id": uniqueRequestId,
                },
            }
        );

        // Extract necessary data
        const { distance, duration } = response.data.routes[0].legs[0];
        console.log(distance);
        console.log(duration);

        res.json(
            new ApiResponse(
                200,
                { distance: distance.text, duration: duration.text },
                "Travel info fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            500,
            `Failed to fetch travel information. Error -> ${
                error.response?.data || error.message
            }`
        );
    }
});

const getGeocode = asyncHandler(async (req, res) => {
    const { address, language } = req.query;

    if (!address) {
        throw new ApiError(400, "Address is required");
    }

    try {
        const apiKey = process.env.OLA_MAPS_API_KEY;
        const url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(
            address
        )}&language=${language || "en"}&api_key=${apiKey}`;
        const uniqueRequestId = uuidv4();

        const response = await axios.get(url, {
            headers: {
                "X-Request-Id": uniqueRequestId,
            },
        });

        // Extract relevant geocode data
        const { lat, lng } =
            response.data.geocodingResults?.[0]?.geometry?.location;
        if (!lat || !lng) {
            throw new ApiError(
                404,
                "Geocode not found for the provided address"
            );
        }

        res.json(
            new ApiResponse(200, { lat, lng }, "Geocode fetched successfully")
        );
    } catch (error) {
        throw new ApiError(
            500,
            `Failed to fetch geocode. Error -> ${
                error.response?.data || error.message
            }`
        );
    }
});

// Utility to fetch geocode for an address
const fetchGeocode = async (address, language = "en") => {
    try {
        const apiKey = process.env.OLA_MAPS_API_KEY;
        const url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(
            address
        )}&language=${language}&api_key=${apiKey}`;
        const uniqueRequestId = uuidv4();

        const response = await axios.get(url, {
            headers: {
                "X-Request-Id": uniqueRequestId,
            },
        });

        const { lat, lng } =
            response.data.geocodingResults?.[0]?.geometry?.location || {};
        if (!lat || !lng) {
            throw new ApiError(
                404,
                `Geocode not found for address: ${address}`
            );
        }
        return `${lat},${lng}`;
    } catch (error) {
        throw new ApiError(
            401,
            "Failed to get the geocodes during optimizeRoute"
        );
    }
};

// Main function to optimize the route
const optimizeRoute = asyncHandler(async (req, res) => {
    let { source, destination } = req.body;

    // Validate input
    if (!source || !destination) {
        throw new ApiError(400, "Source and destination are required");
    }

    // Convert source and destination to coordinates if needed
    if (typeof source === "string") source = await fetchGeocode(source);
    if (typeof destination === "string")
        destination = await fetchGeocode(destination);

    try {
        const apiKey = process.env.OLA_MAPS_API_KEY;
        const uniqueRequestId = uuidv4();

        // API call to optimize route
        const locations = `${source}|${destination}`;
        const url = `https://api.olamaps.io/routing/v1/routeOptimizer?locations=${locations}&api_key=${apiKey}`;

        const response = await axios.post(url, null, {
            headers: {
                "X-Request-Id": uniqueRequestId,
            },
        });

        res.json(
            new ApiResponse(200,{ distance: `${response.data?.routes?.[0]?.legs?.[0]?.readable_distance}km`, duration: `${response.data?.routes?.[0]?.legs?.[0]?.readable_duration}`}, "Route optimized successfully")
        );
    } catch (error) {
        throw new ApiError(
            500,
            `Failed to optimize route. Error -> ${
                error.response?.data || error.message
            }`
        );
    }
});

export { getTravelInfo, getGeocode, optimizeRoute };
