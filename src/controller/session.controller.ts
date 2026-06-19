import { sessionStore } from "../db/schema/schema.js";
import { db } from "../db/index.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAllSessions = asyncHandler(async (req, res) => {
    const userId = (req as any).user.userId;

    const sessions = await db.select().from(sessionStore).where(eq(sessionStore.userId, userId)).execute();

    return res.status(200).json(new ApiResponse(200, sessions, "Sessions fetched successfully"));
})

const deleteAllSession = asyncHandler(async (req, res) => {
    const userId = (req as any).user.userId;

    const options = {httpOnly: true, secure: true, sameSite: "strict"} as const;

    res.clearCookie("refreshToken", options);
    res.clearCookie("accessToken", options);

    const session = await db.delete(sessionStore).where(eq(sessionStore.userId, userId)).execute();

    if (!session) {
        throw new ApiError(500, "Failed to delete sessions");
    }

    return res.status(200).json(new ApiResponse(200, "Successfully logged out of all active devices"));
})

const deleteSession = asyncHandler(async (req, res) => {
    const {sessionId} = req.params as { sessionId: string };

    if(!sessionId){
        throw new ApiError(400, "Session id required");
    }

    const userId = (req as any).user.userId;

    const matchedSessions = await db.select().from(sessionStore).where(
        and(
            eq(sessionStore.id, sessionId),
            eq(sessionStore.userId, userId)
        )
    ).execute();
    const session = matchedSessions[0];

    if(!session){
        throw new ApiError(404, "Session not found");
    }

    await db.delete(sessionStore).where(eq(sessionStore.id, sessionId)).execute();

    return res.status(200).json(new ApiResponse(200, "Session deleted successfully"));
})

export {deleteAllSession, getAllSessions, deleteSession}