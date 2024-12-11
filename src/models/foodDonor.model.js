import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const foodDonorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
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
        type: {
            type: String,
            enum: ["restaurant", "caterer", "others"],
        },
        fssaiLicense: {
            type: Object,
        },
        location: {
            type: String,
        },
        contactInfo: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        },
        geoCodes: {
            type: String,
        },
    },
    { timestamps: true }
);

foodDonorSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

foodDonorSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

foodDonorSchema.methods.generateAccessToken = async function (expiresIn) {
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

foodDonorSchema.methods.generateRefreshToken = async function () {
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

export const FoodDonor = mongoose.model("FoodDonor", foodDonorSchema);
