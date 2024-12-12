import { Delivery } from "../models/delivery.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Ngo } from "../models/ngo.model.js";
import { getGeocode } from "./maps.controller.js";
import sendEmail from "../utils/sendMail.js";

const startDelivery = asyncHandler(async (req, res) => {
    // Get the details
    const { ngoId, donorId, foodItemId, ngoLocation, foodDonorLocation } =
        req.body;

    // Validate the data
    if ([ngoId, donorId, foodItemId].some((field) => !field?.trim())) {
        throw new ApiError(400, "Required fields are missing");
    }

    // retrieve ngo
    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
        throw new ApiError(404, "NGO not found");
    }

    // retrieve food item
    const foodItem = await Delivery.findById(foodItemId);
    if (!foodItem) {
        throw new ApiError(404, "Food item not found");
    }

    // retrieve food donor
    const foodDonor = await Delivery.findById(donorId);
    if (!foodDonor) {
        throw new ApiError(404, "Food Donor not found");
    }

    // Create a new delivery record
    const delivery = await Delivery.create({
        ngoId,
        donorId,
        foodItemId,
        status: "Started",
    });

    const updatedNgo = await Ngo.findByIdAndUpdate(
        ngoId,
        { $set: { geoCodes: ngoLocation } },
        { new: true }
    );

    const updatedDonor = await Delivery.findByIdAndUpdate(
        donorId,
        { $set: { geoCodes: foodDonorLocation } },
        { new: true }
    );

    // generate otp and send to ngo on email
    const otp = Math.floor(100000 + Math.random() * 900000);

    // send otp to ngo
    try {
        await sendEmail(ngo.email, "Delivery started", `Your OTP is ${otp}`);
    } catch (error) {
        throw new ApiError(500, "Failed to send email");
    }
    // Send response to the frontend
    return res.status(201).json(
        new ApiResponse(
            201,
            {
                delivery,
                foodDonorLocation,
                ngoLocation,
                foodDonorUsername: foodDonor.username,
                ngoUsername: ngo.username,
            },
            "Delivery started successfully"
        )
    );
});

const getNgoDeliveryHistory = asyncHandler(async (req, res) => {
    const { ngoId } = req.body;
    const deliveries = await Delivery.aggregate([
        // Match deliveries by ngoId
        {
            $match: { ngoId: ngoId },
        },
        // Lookup for Food Donor details
        {
            $lookup: {
                from: "fooddonors",
                localField: "donorId",
                foreignField: "_id",
                as: "foodDonor",
            },
        },
        // Lookup for NGO details
        {
            $lookup: {
                from: "ngos",
                localField: "ngoId",
                foreignField: "_id",
                as: "ngo",
            },
        },
        // Extract the first item from the lookup arrays
        {
            $addFields: {
                foodDonor: { $arrayElemAt: ["$foodDonor", 0] },
                ngo: { $arrayElemAt: ["$ngo", 0] },
            },
        },
        // Project required fields
        {
            $project: {
                _id: 1, // Include the delivery ID
                ngoUsername: "$ngo.username",
                foodDonorUsername: "$foodDonor?.username",
                ngoLocation: "$ngo.location",
                foodDonorLocation: "$foodDonor.location",
                deliveryDate: "$createdAt",
            },
        },
    ]);

    // Send response
    res.status(200).json(
        new ApiResponse(200, deliveries, "Delivery history sent successfully")
    );
});

export { startDelivery, getNgoDeliveryHistory };
