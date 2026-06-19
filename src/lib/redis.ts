import { Redis } from "ioredis";
import "dotenv/config";

const redisClient = new Redis(process.env.REDIS_URL!)

redisClient.on("connect", () => {
    console.log("Redis connected");
})

redisClient.on("error", (error) => {
    console.log("Redis error: ", error);
})

export { redisClient };