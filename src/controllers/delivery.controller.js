import { Delivery } from "../models/delivery.model";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const startDelivery = asyncHandler(async (req, res) => {
    // Get the details
    const { ngoId, donorId, foodItemId } = req.body;

    // Validate the data
    if ([ngoId, donorId, foodItemId].some((field) => !field?.trim())) {
        throw new ApiError(400, "Required fields are missing");
    }

    // Create a new delivery record
    const delivery = await Delivery.create({
        ngoId,
        donorId,
        foodItemId,
        status: "Pending",
    });

    // Aggregate food donor and NGO details
    const result = await Delivery.aggregate([
        {
            $match: { _id: delivery._id }, // Match the created delivery document
        },
        {
            $lookup: {
                from: "fooddonors", // Collection of food donors
                localField: "donorId",
                foreignField: "_id",
                as: "foodDonor",
            },
        },
        {
            $lookup: {
                from: "ngos", // Collection of NGOs
                localField: "ngoId",
                foreignField: "_id",
                as: "ngo",
            },
        },
        {
            $addFields: {
                foodDonor: { $arrayElemAt: ["$foodDonor", 0] }, // Extract first element
                ngo: { $arrayElemAt: ["$ngo", 0] }, // Extract first element
            },
        },
        {
            $project: {
                foodDonorLocation: "$foodDonor.location",
                ngoLocation: "$ngo.location",
                foodDonorUsername: "$foodDonor.username",
                ngoName: "$ngo.name", // Include more fields as needed
            },
        },
    ]);

    // Check if aggregation returned a result
    if (!result || result.length === 0) {
        throw new ApiError(404, "Delivery details not found");
    }

    // Send response to the frontend
    return res.status(201).json({
        message: "Delivery process started",
        deliveryDetails: result[0],
    });
});

const getNgoDeliveryHistory = asyncHandler(async (req, res) => {
    const deliveries = await Delivery.aggregate([
        // Match deliveries by ngoId
        {
            $match: { ngoId: mongoose.Types.ObjectId(req.body.ngo._id) },
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
                ngoName: "$ngo.name",
                foodDonorName: "$foodDonor?.name" || "$foodDonor.username",
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
