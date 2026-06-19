import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/schema.js";
import { eq } from "drizzle-orm";
import { redisClient } from "../lib/redis.js";

export const verifyJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const accessToken = req.cookies?.accessToken;

        if (!accessToken) {
            throw new ApiError(401, "Unauthorized");
        }

        const isBlacklisted = await redisClient.get(`blacklist:${accessToken}`);
        if (isBlacklisted === 'true') {
            throw new ApiError(401, "Access token is blacklisted");
        }

        const { userId, sessionId } = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as { userId: string, sessionId: string };

        (req as any).user = { userId, sessionId };

        return next();
    } catch (error: any) {
        if(error.name === "TokenExpiredError"){
            return next(new ApiError(401, "Access token expired"))
        }

        if (error.name === "JsonWebTokenError") {
            return next(new ApiError(401, "Invalid access token"));
        }

        return next(new ApiError(401, error.message || "Unauthorized request"));
    }
};
