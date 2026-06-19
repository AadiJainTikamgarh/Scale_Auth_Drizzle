import { z } from "zod";

export const registerValidator = z.object({
    body: z.object({
        first_name: z.string().trim().min(1, "First name is required"),
        last_name: z.string().trim().min(1, "Last name is required"),
        username: z.string().trim().min(3, "Username must be at least 3 characters long"),
        email: z.string().trim().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
    }),
});

export const loginValidator = z.object({
    body: z.object({
        email: z.string().trim().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
    }),
});

export const changePasswordValidator = z.object({
    body: z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters long"),
    }),
});

export const forgetPasswordRequestValidator = z.object({
    body: z.object({
        email: z.string().trim().email("Invalid email address"),
    }),
});

export const resetPasswordValidator = z.object({
    body: z.object({
        token: z.string().min(1, "Token is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters long"),
    }),
});
