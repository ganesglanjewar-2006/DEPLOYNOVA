const Rule = require('../models/Rule');
const ExecutionLog = require('../models/ExecutionLog');
const cronEngine = require('../services/CronEngine');

// 🏁 Create New Rule
exports.createRule = async (req, res) => {
    try {
        const rule = await Rule.create({
            ...req.body,
            owner: req.user.id
        });

        // If active cron rule, schedule it immediately
        if (rule.status === 'active' && rule.trigger.type === 'cron') {
            cronEngine.scheduleRule(rule);
        }

        res.status(201).json({ success: true, rule });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 📋 Get All Rules
exports.getRules = async (req, res) => {
    try {
        const rules = await Rule.find({ owner: req.user.id }).sort('-createdAt');
        res.json({ success: true, count: rules.length, rules });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🔄 Update Rule
exports.updateRule = async (req, res) => {
    try {
        let rule = await Rule.findById(req.params.id);
        if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });

        // Update fields
        rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        // Update cron schedule
        if (rule.trigger.type === 'cron') {
            if (rule.status === 'active') {
                cronEngine.scheduleRule(rule);
            } else {
                cronEngine.stopRule(rule._id);
            }
        }

        res.json({ success: true, rule });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// 🗑️ Delete Rule
exports.deleteRule = async (req, res) => {
    try {
        const rule = await Rule.findById(req.params.id);
        if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });

        // Stop if running
        cronEngine.stopRule(rule._id);
        
        await rule.deleteOne();
        res.json({ success: true, message: 'Rule deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 📜 Get Execution Logs
exports.getLogs = async (req, res) => {
    try {
        const logs = await ExecutionLog.find()
            .populate('ruleId', 'name')
            .sort('-timestamp')
            .limit(50);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
