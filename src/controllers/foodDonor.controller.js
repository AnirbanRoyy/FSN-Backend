import { FoodDonor } from "../models/foodDonor.model.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

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

    // Create new user
    const createdUser = await FoodDonor.create({
        // name: req.body.userLicense.company_name,
        username: username.toLowerCase().split(" ").join("").trim(),
        email: email.toLowerCase().split(" ").join("").trim(),
        password,
        avatar: avatar.url,
        type,
        fssaiLicense: req.body.userLicense,
        location:
            req.body.userLicense.premise_address +
            ", " +
            req.body.userLicense.state,
        contactInfo,
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
            { username: username.toLowerCase().split(" ").join("") },
            { email: email.toLowerCase().trim() },
        ],
    });

    if (!user) {
        throw new ApiError(400, "No such user found during login");
    }

    // validate the password
    const isPasswordValid = user.isPasswordCorrect(password);
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
        req.user._id,
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
    const user = await FoodDonor.findById(req.user?._id);
    if (!user) {
        throw new ApiError(
            401,
            "User not found. Failed to update the password!"
        );
    }

    // check if old password is correct
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError("Invalid oldPassword");
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
                req.user,
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
        req.user._id,
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
    const oldAvatar = req.user.avatar;
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
        req.user._id,
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

const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await FoodDonor.findOne({ email });
    if (!user) {
        throw new ApiError(404, "No user found with that email");
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before saving
    user.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes

    await user.save({ validateBeforeSave: false });

    // Send email with the reset link
    const resetUrl = `${req.protocol}://${req.get(
        "host"
    )}/api/v1/fooddonors/reset-password/${resetToken}`;

    const message = `Click the link to reset your password: ${resetUrl}`;
    const transporter = nodemailer.createTransport({
        service: "Gmail", // or another email provider
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"Food Saver Network" <${process.env.EMAIL}>`,
        to: user.email,
        subject: "Password Reset Request",
        text: message,
    });

    res.status(200).json(new ApiResponse(200, {}, "Reset link sent to email"));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;

    // Hash the token to match the stored one
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await FoodDonor.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or expired");
    }

    const { newPassword } = req.body;
    // Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json(new ApiResponse(200, {}, "Password reset successful"));
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
    requestPasswordReset,
    resetPassword,
};