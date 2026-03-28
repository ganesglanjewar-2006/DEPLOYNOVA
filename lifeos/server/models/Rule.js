const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Rule name is required'],
        trim: true
    },
    trigger: {
        type: {
            type: String,
            enum: ['cron', 'webhook', 'event'],
            required: true
        },
        value: {
            type: String,
            required: true // e.g., "* * * * *" for cron
        }
    },
    action: {
        type: {
            type: String,
            enum: ['deploy', 'notify', 'webhook'],
            required: true
        },
        targetId: {
            type: String, // e.g., Project ID for deploy action
            required: true
        },
        payload: {
            type: Object,
            default: {}
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    lastExecuted: {
        type: Date
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Rule', ruleSchema);
