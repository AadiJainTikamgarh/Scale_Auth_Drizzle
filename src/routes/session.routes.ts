import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getAllSessions, deleteAllSession, deleteSession } from "../controller/session.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { deleteSessionValidator } from "../validators/session.validator.js";
import rateLimit from "express-rate-limit";

const router = Router();

router.use(verifyJWT);

const sessionRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
})

router.route("/all").get(sessionRateLimiter, getAllSessions);
router.route("/delete-all").delete(sessionRateLimiter, deleteAllSession);
router.route("/delete/:sessionId").delete(validate(deleteSessionValidator), deleteSession);

export default router;