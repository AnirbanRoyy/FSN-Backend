// src/controllers/maps.controller.js
import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuidv4 } from "uuid";

const uniqueRequestId = uuidv4();

const getTravelInfo = asyncHandler(async (req, res) => {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
        throw new ApiError(400, "Origin and destination are required");
    }

    try {
        // API key from environment variables
        const apiKey = process.env.OLA_MAPS_API_KEY;

        // Construct the URL with query parameters
        const url = `https://api.olamaps.io/routing/v1/directions?origin=${origin}&destination=${destination}&api_key=${apiKey}`;

        // Make the POST request
        const response = await axios.post(url, {}, {
            headers: {
                "X-Request-Id": uniqueRequestId
            },
        });

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
        throw new ApiError(500, `Failed to fetch travel information. Error -> ${error.response?.data || error.message}`);
    }
});

export { getTravelInfo };
