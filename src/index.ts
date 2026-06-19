import express from "express"
import "dotenv/config"
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./utils/ErrorHandler.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(cookieParser());

import healthCheckRouter from "./routes/healthcheck.routes.js"
import userRouter from "./routes/users.routes.js"
import sessionRouter from "./routes/session.routes.js"

app.use("/api/v1/health-check", healthCheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/sessions", sessionRouter);


app.use(errorHandler)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})