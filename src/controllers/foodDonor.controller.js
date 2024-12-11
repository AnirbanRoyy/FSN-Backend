import { FoodDonor } from "../models/foodDonor.model.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import sendEmail from "../utils/sendMail.js";
import { getGeocode } from "./maps.controller.js";

const registerUser = asyncHandler(async (req, res) => {
    // get the data from form
    const { username, email, password, type, contactInfo } = req.body;

    // validate the data
    if (
        [username, email, password, type, contactInfo].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(
            400,
            "Required fields are missing during registration"
        );
    }

    // get the profile picture and license image
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(
            401,
            "Avatar Local Path not found during registration"
        );
    }

    // upload them on Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(
            500,
            "Failed to upload avatar on Cloudinary during registration"
        );
    }

    // Check if user already exists
    const existingUser = await FoodDonor.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        throw new ApiError(
            400,
            "FoodDonor already exists. Can't register again"
        );
    }

    const geoCodes = await getGeocode(
        `${req.body.userLicense.premise_address}, ${req.body.userLicense.state}`
    );

    // Create new user
    const createdUser = await FoodDonor.create({
        // name: req.body.userLicense.company_name,
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password,
        avatar: avatar.url,
        type,
        fssaiLicense: req.body.userLicense,
        location:
            req.body.userLicense.premise_address +
            ", " +
            req.body.userLicense.state,
        contactInfo,
        geoCodes
    });

    const user = await FoodDonor.findById(createdUser._id).select(
        "-password -refreshToken"
    );

    // Check if user is created successfully
    if (!user) {
        throw new ApiError(
            401,
            "FoodDonor couldn't be registered successfully"
        );
    }

    // send response
    return res
        .status(201)
        .json(new ApiResponse(200, user, "FoodDonor registered successfully"));
});

const generateAccessAndRefreshTokens = async function (userId) {
    const user = await FoodDonor.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // store the refreshToken in db
    user.refreshToken = refreshToken;
    await user.save({
        validateBeforeSave: false,
    });

    return {
        accessToken,
        refreshToken,
    };
};

const loginUser = asyncHandler(async (req, res) => {
    // get data
    const { username, email, password } = req.body;

    // check if both username and email are missing
    if (!username && !email) {
        throw new ApiError(
            401,
            "Both username and email are missing during login"
        );
    }

    // find the user
    const user = await FoodDonor.findOne({
        $or: [
            { username: username.toLowerCase().trim() },
            { email: email.toLowerCase().trim() },
        ],
    });

    if (!user) {
        throw new ApiError(400, "No such user found during login");
    }

    // validate the password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password during login");
    }

    // generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    // remove password and refreshToken fields
    const loggedInUser = await FoodDonor.findById(user._id).select(
        "-password -refreshToken"
    );

    // set options for cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    // send cookies as well as res
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "FoodDonor logged in"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await FoodDonor.findByIdAndUpdate(
        req.foodDonor._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(201)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "FoodDonor logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // get the refreshToken
    const incomingRefreshToken =
        req.cookies?.refreshToken ||
        req.header("Authorization").replace("Bearer ", "");
    if (!incomingRefreshToken) {
        throw new ApiError(
            401,
            "refreshToken not found to refresh access token"
        );
    }

    // decode the token
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await FoodDonor.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid refreshToken");
    }

    // verify the token
    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "refreshToken is expired or used");
    }

    // generate the new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    // send cookies and a response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                },
                "New tokens generated successfully"
            )
        );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // get the passwords
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword && !newPassword) {
        throw new ApiError(
            401,
            "Both oldPassword and newPassword are required while changing the password!"
        );
    }

    // we will be using verifyJwt middleware in foodDonor.route.js

    // get user from req
    const user = await FoodDonor.findById(req.foodDonor?._id);
    if (!user) {
        throw new ApiError(
            401,
            "User not found. Failed to update the password!"
        );
    }

    // check if old password is correct
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid oldPassword");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "FoodDonor password updated successfully!")
        );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.foodDonor,
                "Current FoodDonor details sent successfully"
            )
        );
});

const updateUserDetails = asyncHandler(async (req, res) => {
    const { email, contactInfo } = req.body;

    if (!email && !contactInfo) {
        throw new ApiError(400, "Send either email or contactInfo to update");
    }

    const user = await FoodDonor.findByIdAndUpdate(
        req.foodDonor._id,
        {
            $set: {
                email: email || req.user.email,
                contactInfo: contactInfo || req.user.contactInfo,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "FoodDonor details updated successfully")
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    const oldAvatar = req.foodDonor.avatar;
    if (!oldAvatar) {
        throw new ApiError(401, "oldAvatar not found");
    }

    // get the avatar local path through multer
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Local Path not found to update");
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // delete old image

    await deleteFromCloudinary(oldAvatar);

    if (!avatar) {
        throw new ApiError(
            401,
            "Failed to upload on cloudinary while updating"
        );
    }

    const user = await FoodDonor.findByIdAndUpdate(
        req.foodDonor._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const getAllFoodDonors = asyncHandler(async (req, res) => {
    const foodDonors = await FoodDonor.find().select("-password -refreshToken");
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                foodDonors,
                "All foodDonors details sent successfully"
            )
        );
});

const getOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "email is required to sent password reset otp");
    }

    const user = await FoodDonor.findOne({ email });
    if (!user) {
        throw new ApiError(400, "foodDonor not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

    const message = `Your OTP to reset the password is: ${otp}`;

    try {
        await sendEmail(email, "Password Reset OTP", message);
        return res
            .status(200)
            .json(new ApiResponse(200, { otp }, "OTP sent successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to send OTP");
    }
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    getAllFoodDonors,
    getOTP,
};
