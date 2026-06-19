import { z } from "zod";

export const deleteSessionValidator = z.object({
    params: z.object({
        sessionId: z.string().uuid("Invalid session id")
    })
})  
