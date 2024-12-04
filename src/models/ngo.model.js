import mongoose from "mongoose";

const ngoSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            index: true,
            lowercase: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String,
            required: true,
        },
        ngoLicense: {
            type: String,
            required: true,
        },
        location: {
            city: {
                type: String,
                required: true,
            },
            state: {
                type: String,
                required: true,
            },
        },
        contactInfo: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
);

export const Ngo = mongoose.model("Ngo", ngoSchema);
