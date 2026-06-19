import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { db } from "../db/index.js";
import { users, sessionStore } from "../db/schema/schema.js";
import { eq, or, and, ne } from "drizzle-orm";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateEmailHtml } from "../utils/mailGenerator.js";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "../utils/password.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

const generateToken = () => {
    const unhashedToken = crypto.randomBytes(32).toString("hex");
    const token = crypto.createHash("sha256").update(unhashedToken).digest("hex");
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return { token, expiryTime, unhashedToken }
}

const generateRefreshAccessToken = (userId: string) => {
    const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET!, {
        expiresIn: "7d"
    })

    const accessToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET!, {
        expiresIn: "15m"
    })

    const oneDay = 24 * 60 * 60 * 1000;
    const refreshTokenExpiryTime = 7 * oneDay;
    const accessTokenExpiryTime = 15 * 60 * 1000;

    return { refreshToken, accessToken, refreshTokenExpiryTime, accessTokenExpiryTime }
}

const register = asyncHandler(async (req, res) => {
    const { first_name, last_name, username, email, password } = req.body;

    if (!first_name || !last_name || !username || !email || !password) {
        throw new ApiError(400, "All fields are required");
    }

    const isUserExist = await db.select().from(users).where(
        or(
            eq(users.email, email),
            eq(users.username, username)
        )
    ).execute()

    if (isUserExist.length > 0) {
        throw new ApiError(400, "User already exists");
    }

    const { token, expiryTime: verifyTokenExpiry, unhashedToken: verifyUnhashedToken } = generateToken();
    const hashedPassword = await hashPassword(password);

    const createUser = await db.insert(users).values({
        first_name,
        last_name,
        username,
        email,
        password: hashedPassword,
        verifyToken: token,
        verifyTokenExpiry
    });

    if (!createUser) {
        throw new ApiError(500, "Failed to create user")
    }

    const verificationLink = `${process.env.CLIENT_URL || "http://localhost:3001"}/verify-email?token=${verifyUnhashedToken}`;

    const emailHtml = generateEmailHtml({
        title: "Verify your email address",
        greeting: `Hello ${first_name},`,
        introLines: [
            "Thank you for registering. Please verify your email address to activate your account and start using Scale Auth."
        ],
        actionButton: {
            text: "Verify Email Address",
            link: verificationLink
        },
        outroLines: [
            "This link will expire in 24 hours.",
            "If you did not create an account with us, you can safely ignore this email."
        ]
    });

    try {
        await sendEmail({
            to: email,
            subject: "Verify your email address",
            html: emailHtml
        });
    } catch (error: any) {
        throw new ApiError(500, error.message || "Failed to send verification email");
    }

    return res.status(201).json(new ApiResponse(201, "Verification mail sent successfully"))
})

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new ApiError(404, "Token not found");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const matchedUsers = await db.select().from(users).where(eq(users.verifyToken, hashedToken)).execute();
    const user = matchedUsers[0];

    if (!user) {
        throw new ApiError(404, "Invalid verification token");
    }

    if(user.isVerified){
        throw new ApiError(400, "User is already verified");
    }

    if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
        throw new ApiError(400, "Verification token has expired");
    }

    await db.update(users).set({
        isVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null
    }).where(eq(users.id, user.id)).execute()

    return res.status(200).json(new ApiResponse(200, "Email verified successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required")
    }

    const matchedUsers = await db.select().from(users).where(eq(users.email, email)).execute();
    const user = matchedUsers[0];

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordMatch = await verifyPassword(user.password, password);

    if (!isPasswordMatch) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken, refreshTokenExpiryTime, accessTokenExpiryTime } = generateRefreshAccessToken(user.id);

    const expiresAt = new Date(Date.now() + refreshTokenExpiryTime);

    const insertedSession = await db.insert(sessionStore).values({
        userId: user.id,

        refreshToken,
        device: req.get("User-Agent") || "unknown",
        ipAddress: req.ip || "[IP_ADDRESS]",
        expiresAt
    }).returning().execute();

    const session = insertedSession[0];

    if (!session) {
        throw new ApiError(500, "Failed to create session");
    }

    const options = { httpOnly: true, secure: true, sameSite: "strict" } as const;

    res.cookie("refreshToken", refreshToken, {
        ...options,
        maxAge: refreshTokenExpiryTime
    })

    res.cookie("accessToken", accessToken, {
        ...options,
        maxAge: accessTokenExpiryTime
    })

    res.cookie("sessionId", session.id, {
        ...options,
        maxAge: refreshTokenExpiryTime
    })

    return res.status(200).json(new ApiResponse(200, { email: user.email, user_id: user.id, session_id: session.id }, "Logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    const {sessionId} = req.cookies;

    if (!sessionId) {
        return res.status(200).json(new ApiResponse(200, "No refresh token found"))
    }

    const matchedSession = await db.select().from(sessionStore).where(eq(sessionStore.id, sessionId)).execute();
    const session = matchedSession[0];

    if (!session) {
        throw new ApiError(404, "Session not found");
    }

    await db.delete(sessionStore).where(eq(sessionStore.id, sessionId)).execute();

    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.clearCookie("sessionId");

    return res.status(200).json(new ApiResponse(200, "Logged out successfully"))
})

const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { userId } = (req as any).user as { userId: string };

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Current and new password are required");
    }

    const matchedUser = await db.select().from(users).where(eq(users.id, userId)).execute();
    const user = matchedUser[0];

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordMatch = await verifyPassword(user.password, currentPassword);
    if (!isPasswordMatch) {
        throw new ApiError(401, "Incorrect password")
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await db.update(users).set({
        password: hashedNewPassword
    }).where(eq(users.id, user.id)).execute();

    await db.delete(sessionStore).where(
        and(
            eq(sessionStore.userId, user.id),
            ne(sessionStore.ipAddress, req.ip || "")
        )
    ).execute();

    return res.status(200).json(new ApiResponse(200, "Password updated successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const { refreshToken, sessionId } = (req as any).session as { refreshToken: string, sessionId: string };

    const matchSession = await db.select().from(sessionStore).where(eq(sessionStore.id, sessionId)).execute();
    const session = matchSession[0];

    if (!session) {
        throw new ApiError(404, "Session not found");
    }

    if (session.refreshToken != refreshToken) {
        throw new ApiError(400, "Invalid refresh token");
    }

    const { refreshToken: newRefreshToken, accessToken: newAccessToken, refreshTokenExpiryTime, accessTokenExpiryTime } = generateRefreshAccessToken(session.userId);

    const expiresAt = new Date(Date.now() + refreshTokenExpiryTime);

    await db.update(sessionStore).set({
        refreshToken: newRefreshToken,
        expiresAt
    }).where(eq(sessionStore.id, session.id)).execute();

    const options = { httpOnly: true, secure: true, sameSite: "strict" } as const;

    res.cookie("refreshToken", newRefreshToken, {
        ...options,
        maxAge: refreshTokenExpiryTime
    })

    res.cookie("accessToken", newAccessToken, {
        ...options,
        maxAge: accessTokenExpiryTime
    })

    res.cookie("sessionId", session.id, {
        ...options,
        maxAge: refreshTokenExpiryTime
    })

    return res.status(200).json(
        new ApiResponse(200, { accessToken: newAccessToken }, "Access token refreshed successfully")
    );
})

const resendVerificationEmail = asyncHandler(async (req, res) => {
    const {userId} = (req as any).user as {userId: string};

    if (!userId) {
        throw new ApiError(400, "User not found")
    }

    const matchedUsers = await db.select().from(users).where(eq(users.id, userId)).execute();
    const user = matchedUsers[0];

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (user.isVerified) {
        throw new ApiError(400, "User is already verified")
    }

    const { token: newToken, expiryTime } = generateToken()

    await db.update(users).set({
        verifyToken: newToken,
        verifyTokenExpiry: expiryTime
    }).where(eq(users.id, user.id)).execute();

    const verificationLink = `${process.env.CLIENT_URL || "http://localhost:3001"}/api/v1/users/verify-email?token=${newToken}`;

    const emailHtml = generateEmailHtml({
        title: "Verify your email address",
        greeting: `Hello ${user.first_name},`,
        introLines: [
            "We received a request to resend your verification email. Please verify your email address to activate your account."
        ],
        actionButton: {
            text: "Verify Email Address",
            link: verificationLink
        },
        outroLines: [
            "This link will expire in 24 hours.",
            "If you did not request this, you can safely ignore this email."
        ]
    });

    try {
        await sendEmail({
            to: user.email,
            subject: "Resend Verification Email",
            html: emailHtml
        });
    } catch (error: any) {
        throw new ApiError(500, error.message || "Failed to send verification email")
    }

    return res.status(200).json(new ApiResponse(200, "Verification mail sent successfully"))
})

const forgetPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const matchedUser = await db.select().from(users).where(eq(users.email, email)).execute();
    const user = matchedUser[0];

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const { token: newToken, unhashedToken } = generateToken();
    const expireTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.update(users).set({
        forgetPasswordToken: newToken,
        forgetPasswordTokenExpiry: expireTime
    }).where(eq(users.id, user.id)).execute();

    const resetLink = `${process.env.CLIENT_URL || "http://localhost:3001"}/reset-password?token=${unhashedToken}`;

    const emailHtml = generateEmailHtml({
        title: "Reset your password",
        greeting: `Hello ${user.first_name},`,
        introLines: [
            "We received a request to reset your password. Please click the link below to set a new password."
        ],
        actionButton: {
            text: "Reset Password",
            link: resetLink
        },
        outroLines: [
            "This link will expire in 10 minutes.",
            "If you did not request a password reset, you can safely ignore this email."
        ]
    });

    try {
        await sendEmail({
            to: user.email,
            subject: "Reset your password",
            html: emailHtml
        });
    } catch (error: any) {
        throw new ApiError(500, error.message || "Failed to send password reset email");
    }

    return res.status(200).json(new ApiResponse(200, "Password reset link sent to your email successfully"));
})

const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new ApiError(400, "Token and new password are required");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const matchedUser = await db.select().from(users).where(eq(users.forgetPasswordToken, hashedToken)).execute();
    const user = matchedUser[0];

    if (!user) {
        throw new ApiError(404, "Invalid or expired password reset token");
    }

    if (user.forgetPasswordTokenExpiry && user.forgetPasswordTokenExpiry < new Date()) {
        throw new ApiError(400, "Password reset token has expired");
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.update(users).set({
        password: hashedPassword,
        forgetPasswordToken: null,
        forgetPasswordTokenExpiry: null
    }).where(eq(users.id, user.id)).execute();

    return res.status(200).json(new ApiResponse(200, "Password reset successfully"));
})

export { register, verifyEmail, loginUser, logoutUser, updatePassword, refreshAccessToken, resendVerificationEmail, forgetPasswordRequest, resetPassword }