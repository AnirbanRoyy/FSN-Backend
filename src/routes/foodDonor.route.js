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
    getAllFoodDonors,
} from "../controllers/foodDonor.controller.js";
import { verifyFoodDonorJWT } from "../middlewares/foodDonorAuth.middleware.js";
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
router.route("/get-all-fooddonors").post(getAllFoodDonors);

// secured routes
router.route("/logout").post(verifyFoodDonorJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyFoodDonorJWT, changeCurrentPassword);
router.route("/get-fooddonor").get(verifyFoodDonorJWT, getCurrentUser);
router.route("/update-fooddonor-details").patch(verifyFoodDonorJWT, updateUserDetails);

router.route("/update-avatar").patch(verifyFoodDonorJWT, upload.single("avatar"), updateAvatar);

export default router;
