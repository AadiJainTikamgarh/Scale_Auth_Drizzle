import cron from 'node-cron'
import { db } from '../db/index.js'
import { sessionStore } from '../db/schema/schema.js'
import { lt } from 'drizzle-orm'

const sessionCleanup = () => {
    cron.schedule("0 0 * * *", async () => {
        try {
            await db.delete(sessionStore).where(lt(sessionStore.expiresAt, new Date())).execute();
            console.log("Session cleanup job executed successfully");
        } catch (error) {
            console.error("Error in session cleanup job:", error);
        }
    })
}

export { sessionCleanup }