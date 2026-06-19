// Todo: List session and delete session routes
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getAllSessions, deleteAllSession, deleteSession } from "../controller/session.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { deleteSessionValidator } from "../validators/session.validator.js";

const router = Router();

router.use(verifyJWT);

router.route("/all").get(getAllSessions);
router.route("/delete-all").delete(deleteAllSession);
router.route("/delete/:sessionId").delete(validate(deleteSessionValidator), deleteSession);

export default router;