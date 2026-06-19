import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema: ZodSchema<any>) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            // body can usually be reassigned
            req.body = parsed.body;

            // mutate instead of reassign
            Object.assign(req.query, parsed.query);
            Object.assign(req.params, parsed.params);

            next();
        } catch (error: any) {
            if (error.errors) {
                const errorMessages = error.errors.map((err: any) => {
                    const field = err.path.slice(1).join(".");
                    return field
                        ? `${field}: ${err.message}`
                        : err.message;
                });

                next(
                    new ApiError(
                        400,
                        "Validation failed",
                        errorMessages
                    )
                );
            } else {
                next(
                    new ApiError(
                        400,
                        error.message || "Validation error"
                    )
                );
            }
        }
    };
};