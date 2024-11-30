import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { v4 as uuidv4 } from "uuid";

const API_KEY = process.env.FSSAI_API_KEY;
const VERIFY_URL =
    "https://eve.idfy.com/v3/tasks/async/verify_with_source/ind_fssai";

const verifyFoodDonor = asyncHandler(async (req, res, next) => {
    const task_id = uuidv4();
    const group_id = uuidv4();
    let isNextCalled = false; // Prevent multiple next calls

    try {
        const licenseNumber = req.body.userLicense?.registrationNumber;
        const licenseImage = req.body.userLicense?.licenseImage;
        if (!licenseNumber) {
            throw new ApiError(400, "Registration number is missing");
        }

        // Step 1: Initiate Verification (POST Request)
        const postResponse = await axios.post(
            VERIFY_URL,
            {
                task_id,
                group_id,
                data: { registration_no: licenseNumber },
            },
            {
                headers: {
                    "api-key": API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        const requestId = postResponse.data?.request_id;
        if (!requestId) {
            throw new ApiError(500, "Request ID not found in POST response.");
        }

        console.log(`Request ID Received: ${requestId}`);

        // Step 2: Polling for Verification Result (GET Request)
        const pollStatus = async () => {
            try {
                const getResponse = await axios.get(
                    `https://eve.idfy.com/v3/tasks?request_id=${requestId}`,
                    {
                        headers: { "api-key": API_KEY },
                    }
                );

                const status = getResponse.data?.[0]?.status;
                console.log(`Current Status: ${status}`);

                if (status === "completed") {
                    const result = getResponse.data?.[0]?.result;

                    if (result?.source_output?.status === "id_not_found") {
                        throw new ApiError(404, "FSSAI license is invalid");
                    }

                    console.log("Verification Result:", result);

                    if (
                        result?.source_output?.company_details?.validity?.toLowerCase() ===
                        "inactive"
                    ) {
                        throw new ApiError(401, "Inactive License");
                    }

                    if (!isNextCalled) {
                        req.body.userLicense =
                            result?.source_output?.company_details;
                        req.body.userLicense.licenseImage = licenseImage;
                        isNextCalled = true;
                        return next(); // Move to the next middleware after successful verification
                    }
                } else if (status === "in_progress") {
                    console.log("Task is still in progress. Retrying...");
                    setTimeout(pollStatus, 2000); // Poll again after 5 seconds
                }
            } catch (error) {
                if (!isNextCalled) {
                    isNextCalled = true; // Prevent multiple error responses
                    next(
                        new ApiError(
                            500,
                            `Error during polling -> ${error.message}`
                        )
                    );
                }
            }
        };

        // Start polling
        pollStatus();
    } catch (error) {
        if (!res.headersSent) {
            return next(
                new ApiError(
                    500,
                    `Verification failed for FSSAI license. ${error.message}`
                )
            );
        }
    }
});

export { verifyFoodDonor };
