import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    updateUserDetails,
    changeCurrentPassword,
    getCurrentUser,
    updateAvatar,
    getAllNgos,
    getOTP,
} from "../controllers/ngo.controller.js";
import { verifyJWT } from "../middlewares/ngoAuth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "ngoLicense",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/get-all-ngos").post(getAllNgos);
router.route("/get-otp").post(getOTP);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-user").get(verifyJWT, getCurrentUser);
router.route("/update-user-details").patch(verifyJWT, updateUserDetails);

router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateAvatar);

export default router;
