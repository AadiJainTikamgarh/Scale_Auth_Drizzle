import { Router } from "express";
import { register, loginUser, logoutUser, updatePassword, refreshAccessToken, verifyEmail, resendVerificationEmail, forgetPasswordRequest, resetPassword } from "../controller/users.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerValidator, loginValidator, changePasswordValidator, forgetPasswordRequestValidator, resetPasswordValidator } from "../validators/user.validator.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
})

const emailVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
})

const forgetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
})

router.route("/register").post(authRateLimiter, validate(registerValidator), register);
router.route("/login").post(authRateLimiter, validate(loginValidator), loginUser);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, validate(changePasswordValidator), updatePassword);
router.route("/refresh-access-token").get(refreshAccessToken)
router.route("/verify-email").post(emailVerificationLimiter, verifyEmail)
router.route("/resend-email-verification").post(emailVerificationLimiter, verifyJWT, resendVerificationEmail)
router.route("/forget-password-request").post(forgetPasswordLimiter, validate(forgetPasswordRequestValidator), forgetPasswordRequest);
router.route("/reset-password").post(forgetPasswordLimiter, validate(resetPasswordValidator), resetPassword);

export default router; 