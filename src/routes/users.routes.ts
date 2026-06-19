import { Router } from "express";
import { register, loginUser, logoutUser, updatePassword, refreshAccessToken, verifyEmail, resendVerificationEmail, forgetPasswordRequest, resetPassword } from "../controller/users.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerValidator, loginValidator, changePasswordValidator, forgetPasswordRequestValidator, resetPasswordValidator } from "../validators/user.validator.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(validate(registerValidator), register);
router.route("/login").post(validate(loginValidator), loginUser);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, validate(changePasswordValidator), updatePassword);
router.route("/refresh-access-token").get(refreshAccessToken)
router.route("/verify-email").post(verifyEmail)
router.route("/resend-email-verfication").post(verifyJWT, resendVerificationEmail)
router.route("/forget-password-request").post(validate(forgetPasswordRequestValidator), forgetPasswordRequest);
router.route("/reset-password").post(validate(resetPasswordValidator), resetPassword);

export default router; 