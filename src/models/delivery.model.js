import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
    {
        ngoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NGO",
        },
        status: {
            type: String,
            required: true,
            default: "Started"
        },
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodDonor",
        },
        foodItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodItem",
        }
    },
    { timestamps: true }
);

export const Delivery = mongoose.model("Delivery", deliverySchema);