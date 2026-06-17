import { ApiError } from "../utils/ApiError.js";
import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data,
    });
  }
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: [],
  });
};