import { sessionCleanup } from "./cleanup.cron.js";

const startCronJobs = () => {
    sessionCleanup();
}

export { startCronJobs };