const axios = require('axios');
const ExecutionLog = require('../models/ExecutionLog');
const Rule = require('../models/Rule');

class RuleExecutor {
    /**
     * Executes a specific rule action
     * @param {Object} rule - The Rule document
     */
    async executeRule(rule) {
        const startTime = Date.now();
        console.log(`[RuleExecutor] ⚡ Executing rule: ${rule.name} (${rule._id})`);

        let status = 'success';
        let message = '';

        try {
            switch (rule.action.type) {
                case 'deploy':
                    message = await this.triggerDeploy(rule.action.targetId);
                    break;
                case 'notify':
                    message = `Notification logic not yet implemented: ${JSON.stringify(rule.action.payload)}`;
                    break;
                case 'webhook':
                    message = `Webhook trigger logic not yet implemented`;
                    break;
                default:
                    throw new Error(`Unknown action type: ${rule.action.type}`);
            }

            // Update rule lastExecuted timestamp
            await Rule.findByIdAndUpdate(rule._id, { lastExecuted: new Date() });

        } catch (err) {
            status = 'failure';
            message = err.message || 'Execution failed';
            console.error(`[RuleExecutor] ❌ Error executing rule ${rule.name}:`, message);
        }

        // Record execution log
        try {
            await ExecutionLog.create({
                ruleId: rule._id,
                status,
                message,
                duration: Date.now() - startTime
            });
            console.log(`[RuleExecutor] ✅ Logged execution for ${rule.name} (${status})`);
        } catch (logErr) {
            console.error(`[RuleExecutor] ❌ Failed to record execution log:`, logErr.message);
        }
    }

    /**
     * Internal: Trigger deployment in DeployNova
     */
    async triggerDeploy(projectId) {
        const url = `${process.env.DEPLOYNOVA_URL}/api/deploy/${projectId}`;
        const config = {
            headers: {
                'x-api-key': process.env.INTERNAL_API_KEY
            }
        };

        try {
            const { data } = await axios.post(url, {}, config);
            return `Deployment triggered successfully. ID: ${data.deployment?.id || 'unknown'}`;
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            throw new Error(`DeployNova Error: ${errorMsg}`);
        }
    }
}

module.exports = new RuleExecutor();
