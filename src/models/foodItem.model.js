import mongoose from "mongoose";

const foodItemSchema = new mongoose.Schema(
    {
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodDonor",
        },
        description: {
            type: String,
            required: true,
        },
        quantity: {
            type: String,
            required: true,
        },
        expiryDate: {
            type: String,
            required: true,
        },
        coverImage: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export const FoodItem = mongoose.model("FoodItem", foodItemSchema);
