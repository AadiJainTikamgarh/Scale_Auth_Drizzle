import { Redis } from "ioredis";

const redisClient = new Redis({
    host: "localhost",
    port: 6379,
    password: "",
    db: 0
})

export { redisClient };