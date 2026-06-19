import { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                sessionId?: string;
            };
            session?: {
                sessionId?: string;
                refreshToken?: string;
                accessToken?: string;
            };
        }
    }
}
