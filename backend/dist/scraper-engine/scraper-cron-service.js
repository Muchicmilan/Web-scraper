import cron from 'node-cron';
import { ScraperConfigurationModel } from './scrape-engine-schema.js';
import { runScrapeJob } from './scraper-engine-service.js';
const activeCronJobs = new Map();
function stopJob(configId) {
    const existingTask = activeCronJobs.get(configId);
    if (existingTask) {
        console.log(`[CronService] Stopping existing scheduled job for config ID: ${configId}`);
        existingTask.stop();
        activeCronJobs.delete(configId);
    }
}
export function stopAllJobs() {
    console.log('[CronService] Stopping all scheduled jobs...');
    let count = 0;
    activeCronJobs.forEach((task, configId) => {
        task.stop();
        count++;
        console.log(`[CronService] Stopped job for config ID: ${configId}`);
    });
    activeCronJobs.clear();
    console.log(`[CronService] Stopped ${count} jobs.`);
}
function scheduleJob(config) {
    const configId = config._id.toString();
    stopJob(configId);
    if (config.cronEnabled && config.cronSchedule && cron.validate(config.cronSchedule)) {
        console.log(`[CronService] Scheduling job "${config.name}" (${configId}) with schedule: ${config.cronSchedule}`);
        try {
            const task = cron.schedule(config.cronSchedule, async () => {
                console.log(`[CronService] Running scheduled job: "${config.name}" (${configId})`);
                try {
                    const currentConfig = await ScraperConfigurationModel.findById(configId).lean();
                    if (currentConfig && currentConfig.cronEnabled) {
                        await runScrapeJob(currentConfig);
                        console.log(`[CronService] Finished scheduled job: "${config.name}" (${configId})`);
                    }
                    else {
                        console.log(`[CronService] Scheduled job "${config.name}" (${configId}) is no longer enabled or found. Skipping run.`);
                        stopJob(configId);
                    }
                }
                catch (error) {
                    console.error(`[CronService] Error running scheduled job "${config.name}" (${configId}): ${error.message}`);
                }
            }, {
                scheduled: true,
            });
            activeCronJobs.set(configId, task);
            console.log(`[CronService] Successfully scheduled job "${config.name}" (${configId})`);
        }
        catch (error) {
            console.error(`[CronService] Failed to create cron task for "${config.name}" (${configId}): ${error.message}`);
        }
    }
    else {
        if (config.cronEnabled && config.cronSchedule) {
            console.warn(`[CronService] Cannot schedule job "${config.name}" (${configId}): Invalid cron schedule "${config.cronSchedule}".`);
        }
        else if (config.cronEnabled && !config.cronSchedule) {
            console.warn(`[CronService] Cannot schedule job "${config.name}" (${configId}): Schedule string is missing.`);
        }
    }
}
export async function initializeCronJobs() {
    console.log('[CronService] Initializing scheduled jobs from database...');
    try {
        const enabledConfigs = await ScraperConfigurationModel.find({
            cronEnabled: true,
            cronSchedule: { $nin: [null, ''] }
        }).lean();
        console.log(`[CronService] Found ${enabledConfigs.length} enabled configurations to schedule.`);
        let scheduledCount = 0;
        for (const config of enabledConfigs) {
            if (config.cronSchedule && cron.validate(config.cronSchedule)) {
                scheduleJob(config);
                scheduledCount++;
            }
            else {
                console.warn(`[CronService] Config "${config.name}" (${config._id}) has invalid cron schedule "${config.cronSchedule}". Skipping.`);
            }
        }
        console.log(`[CronService] Initialization complete. Scheduled ${scheduledCount} jobs.`);
    }
    catch (error) {
        console.error(`[CronService] Error initializing cron jobs: ${error.message}`);
    }
}
export function updateJobSchedule(updatedConfig) {
    console.log(`[CronService] Updating schedule for config "${updatedConfig.name}" (${updatedConfig._id}).
         Enabled: ${updatedConfig.cronEnabled}, Schedule: ${updatedConfig.cronSchedule}`);
    scheduleJob(updatedConfig);
}
export function removeJobSchedule(configId) {
    console.log(`[CronService] Removing schedule for deleted config ID: ${configId}`);
    stopJob(configId);
}
export function getCronStatus() {
    const status = {};
    activeCronJobs.forEach((task, configId) => {
        try {
            status[configId] = { nextRun: 'Scheduled & Running' };
        }
        catch (error) {
            status[configId] = { nextRun: 'Error getting next run time' };
        }
    });
    return {
        activeJobCount: activeCronJobs.size,
        jobs: status
    };
}
