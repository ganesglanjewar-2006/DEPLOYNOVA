const cron = require('node-cron');
const Rule = require('../models/Rule');
const ruleExecutor = require('./RuleExecutor');

class CronEngine {
    constructor() {
        this.jobs = new Map(); // Store active cron jobs: ruleId -> cronJob instance
    }

    /**
     * Initialize Engine -- load all active rules from DB
     */
    async init() {
        console.log('[CronEngine] ⚙️ Initializing Automation Engine...');
        try {
            const activeRules = await Rule.find({ status: 'active', 'trigger.type': 'cron' });
            console.log(`[CronEngine] 🔍 Found ${activeRules.length} active cron rules. Loading...`);
            
            activeRules.forEach(rule => {
                this.scheduleRule(rule);
            });

            console.log('[CronEngine] 🟢 All rules scheduled');
        } catch (err) {
            console.error('[CronEngine] ❌ Initialization failed:', err.message);
        }
    }

    /**
     * Schedule a rule or update existing one
     */
    scheduleRule(rule) {
        // Validation check for cron syntax
        if (!cron.validate(rule.trigger.value)) {
            console.error(`[CronEngine] ⚠️ Invalid cron syntax for rule ${rule.name}: ${rule.trigger.value}`);
            return false;
        }

        // Clean up if already scheduled
        this.stopRule(rule._id);

        try {
            const job = cron.schedule(rule.trigger.value, () => {
                ruleExecutor.executeRule(rule);
            });

            this.jobs.set(rule._id.toString(), job);
            console.log(`[CronEngine] 📅 Scheduled: "${rule.name}" (${rule.trigger.value})`);
            return true;
        } catch (err) {
            console.error(`[CronEngine] ❌ Failed to schedule ${rule.name}:`, err.message);
            return false;
        }
    }

    /**
     * Stop a scheduled rule
     */
    stopRule(ruleId) {
        const job = this.jobs.get(ruleId.toString());
        if (job) {
            job.stop();
            this.jobs.delete(ruleId.toString());
            console.log(`[CronEngine] 🛑 Stopped: ${ruleId}`);
            return true;
        }
        return false;
    }
}

module.exports = new CronEngine();
