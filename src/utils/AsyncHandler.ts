import type { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler = (reqHandler: RequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(reqHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };