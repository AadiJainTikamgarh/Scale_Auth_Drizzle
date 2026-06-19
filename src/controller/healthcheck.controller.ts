import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import type { Request, Response } from "express";

const healthCheck = asyncHandler(async (req: Request, res: Response) => {
    return res.json(new ApiResponse(200, "Server is running...."));
})

export { healthCheck }