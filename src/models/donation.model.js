import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    ngoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NGO",
    },
    donationDate: {
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
}, { timestamps: true });

export const Donation = mongoose.model("Donation", donationSchema);
