import { Router } from "express";
import { register, loginUser, logoutUser, updatePassword, refreshAccessToken } from "../controller/users.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerValidator, loginValidator, changePasswordValidator } from "../validators/user.validator.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(validate(registerValidator), register);
router.route("/login").post(validate(loginValidator), loginUser);
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, validate(changePasswordValidator), updatePassword);
router.route("/refresh-access-token").get(refreshAccessToken)
export default router;