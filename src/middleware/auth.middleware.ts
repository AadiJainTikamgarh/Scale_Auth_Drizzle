import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/schema.js";
import { eq } from "drizzle-orm";

export const verifyJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const accessToken = req.cookies?.accessToken;
        const refreshToken = req.cookies?.refreshToken;
        const sessionId = req.cookies?.sessionId;

        if (!accessToken) {
            throw new ApiError(401, "Access token missing");
        }

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as { id: string };

        const matchedUsers = await db.select().from(users).where(eq(users.id, decoded.id)).execute();
        const user = matchedUsers[0];

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        (req as any).user = { userId: user.id, email: user.email };
        (req as any).session = { sessionId, refreshToken, accessToken };

        next();
    } catch (error: any) {
        next(new ApiError(401, error.message || "Unauthorized request"));
    }
};
