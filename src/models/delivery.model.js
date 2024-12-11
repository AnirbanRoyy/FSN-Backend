import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
    {
        ngoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NGO",
        },
        deliveryDate: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true,
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