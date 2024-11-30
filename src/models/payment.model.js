import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        donorName: {
            type: String,
            required: true,
        },
        amount: {
            type: mongoose.Schema.Types.Decimal128,
            min: 1,
            required: true,
        },
        paymentGateway: {
            type: String,
        },
        donationDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        utr: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
