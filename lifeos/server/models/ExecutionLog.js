const mongoose = require('mongoose');

const executionLogSchema = new mongoose.Schema({
    ruleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rule',
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failure', 'skipped'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    duration: {
        type: Number // in ms
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ExecutionLog', executionLogSchema);
