import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const ngoSchema = new mongoose.Schema(
    {
        fullName: {
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
        geoCodes: {
            type: { type: String, enum: ["Point"] },
            coordinates: { type: [Number] }, // [longitude, latitude]
        },
        isInterested: { type: Boolean, default: false },
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

ngoSchema.index({ geoCodes: "2dsphere" });

ngoSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

ngoSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

ngoSchema.methods.generateAccessToken = async function (expiresIn) {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            password: this.password,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: expiresIn || process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

ngoSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const Ngo = mongoose.model("Ngo", ngoSchema);
