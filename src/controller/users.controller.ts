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

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const hashedPassword = await hashPassword(password);

    const createUser = await db.insert(users).values({
        first_name,
        last_name,
        username,
        email,
        password: hashedPassword,
        verifyToken,
        verifyTokenExpiry
    });

    if (!createUser) {
        throw new ApiError(500, "Failed to create user")
    }

    const verificationLink = `${process.env.CLIENT_URL || "http://localhost:3001"}/api/v1/users/verify-email?token=${verifyToken}`;

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

    const matchedUsers = await db.select().from(users).where(eq(users.verifyToken, token)).execute();
    const user = matchedUsers[0];

    if (!user) {
        throw new ApiError(404, "Invalid verification token");
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


export { register, verifyEmail, loginUser, logoutUser, updatePassword, refreshAccessToken }