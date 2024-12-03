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
    requestPasswordReset,
    resetPassword,
} from "../controllers/foodDonor.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyFoodDonor } from "../middlewares/verifyFssaiLicense.middleware.js";
import { extractLicenseDetails } from "../middlewares/extractLicenseNumber.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "licenseImage",
            maxCount: 1,
        },
    ]),
    extractLicenseDetails,
    verifyFoodDonor,
    registerUser
);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-fooddonor").get(verifyJWT, getCurrentUser);
router.route("/update-fooddonor-details").patch(verifyJWT, updateUserDetails);

router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateAvatar);

export default router;
