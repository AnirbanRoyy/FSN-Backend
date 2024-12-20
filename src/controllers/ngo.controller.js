import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js";
import { Ngo } from "../models/ngo.model.js";

const registerUser = asyncHandler(async (req, res) => {
    // get data from req.body
    const {
        username,
        email,
        password,
        fullName,
        ngoLicense,
        contactInfo,
        city,
        state,
    } = req.body;

    // validate the data
    if (
        [
            username,
            email,
            password,
            fullName,
            ngoLicense,
            contactInfo,
            city,
            state,
        ].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(401, "Required fields are missing");
    }

    // get avatar and coverImage
    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    // validate the avatar
    if (!avatarLocalPath) {
        throw new ApiError(401, "Avatar Local Path not found");
    }

    // check if user exists
    const existingUser = await Ngo.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        throw new ApiError(401, "Ngo already exists");
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // create user
    const user = await Ngo.create({
        username, // the user might send a username with spaces that might cause problem when getting user channel details from url
        fullName,
        email,
        password,
        avatar: avatar.url,
        ngoLicense,
        location: { city, state },
        contactInfo,
    });

    // validate the creation
    if (!user) {
        throw new ApiError(500, "Ngo could not be registered");
    }

    // remove the password and refresh token fields
    const createdUser = await Ngo.findById(user._id).select(
        "-password -refreshToken"
    );

    // return res
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "Ngo registered successfully!!!")
        );
});

const generateAccessAndRefreshTokens = async function (userId) {
    const user = await Ngo.findById(userId);

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
    const user = await Ngo.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "No such Ngo found during login");
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
    const loggedInUser = await Ngo.findById(user._id).select(
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
                    Ngo: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "Ngo logged in"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await Ngo.findByIdAndUpdate(
        req.ngo._id,
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
        .json(new ApiResponse(200, {}, "Ngo logged out successfully"));
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

    const user = await Ngo.findById(decodedToken?._id);

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

    // we will be using verifyJwt middleware in user.route.js

    // get user from req
    const user = await Ngo.findById(req.ngo?._id);

    // check if old password is correct
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError("Invalid oldPassword");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Ngo password updated successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.ngo,
                "Current Ngo details sent successfully"
            )
        );
});

const updateUserDetails = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    if (!email && !fullName) {
        throw new ApiError(400, "Send either email or fullName to update");
    }

    const user = await Ngo.findByIdAndUpdate(
        req.ngo._id,
        {
            $set: {
                email: email || req.ngo.email,
                fullName: fullName || req.ngo.fullName,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Ngo details updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
    // get the avatar local path through multer
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Local Path not found to update");
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // delete old image
    const oldAvatarUrl = req?.ngo?.avatar;
    if (!oldAvatarUrl) {
        throw new ApiError(401, "oldAvatarUrl not found");
    }

    deleteFromCloudinary(oldAvatarUrl);

    if (!avatar) {
        throw new ApiError(
            401,
            "Failed to upload on cloudinary while updating"
        );
    }

    const user = await Ngo.findByIdAndUpdate(
        req.ngo._id,
        {
            $set: {
                avatar,
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

const getAllNgos = asyncHandler(async (req, res) => {
    const ngos = await Ngo.find().select("-password -refreshToken");
    return res
        .status(200)
        .json(new ApiResponse(200, ngos, "All Ngo details sent successfully"));
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
    getAllNgos,
    getOTP,
};
