import {
    pgTable,
    uuid,
    text,
    timestamp,
    boolean,
    index
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    first_name: text("first_name").notNull(),
    last_name: text("last_name").notNull(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    isVerified: boolean("isVerified").default(false),
    verifyToken: text("verifyToken"),
    verifyTokenExpiry: timestamp("verifyTokenExpiry", { mode: "date" }),
    forgetPasswordToken: text("forgetPasswordToken"),
    forgetPasswordTokenExpiry: timestamp("forgetPasswordTokenExpiry", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
}, (table) => [index("email_idx").on(table.email), index("username_idx").on(table.username)])


export const sessionStore = pgTable("session_stores", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
        onDelete: "cascade"
    }).notNull(),
    refreshToken: text("refreshToken").notNull(),
    device: text("device").notNull(),
    ipAddress: text("ip_address").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow()
}, (table) => [index("refresh_token_idx").on(table.refreshToken), index("userId_idx").on(table.userId)])