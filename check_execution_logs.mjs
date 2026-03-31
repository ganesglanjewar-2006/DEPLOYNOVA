import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const ExecutionLogSchema = new mongoose.Schema({
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule' },
    status: String,
    message: String,
    duration: Number,
    timestamp: { type: Date, default: Date.now }
});

const RuleSchema = new mongoose.Schema({
    name: String
});

const ExecutionLog = mongoose.models.ExecutionLog || mongoose.model('ExecutionLog', ExecutionLogSchema);
const Rule = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);

async function checkLogs() {
    try {
        const mongoUri = 'mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri);
        
        const logs = await ExecutionLog.find()
            .populate('ruleId', 'name')
            .sort({ timestamp: -1 })
            .limit(5);
        
        console.log('Recent Executions:');
        logs.forEach(log => {
            console.log(`[${log.timestamp.toISOString()}] ${log.ruleId?.name || 'Unknown Rule'}: ${log.status.toUpperCase()} - ${log.message} (${log.duration}ms)`);
        });
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkLogs();
