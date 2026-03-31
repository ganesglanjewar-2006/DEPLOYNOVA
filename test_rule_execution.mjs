import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ruleExecutor from './lifeos/server/services/RuleExecutor.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'lifeos', 'server', '.env') });

const RuleSchema = new mongoose.Schema({
    name: String,
    trigger: { type: Object },
    action: { type: Object },
    status: String,
    owner: mongoose.Schema.Types.ObjectId
});

const Rule = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);

async function testRule() {
    try {
        const mongoUri = 'mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri);
        
        const rule = await Rule.findOne({ name: 'Prtoduction Deployment' });
        if (!rule) {
            console.log('❌ Rule not found');
            return;
        }
        
        console.log(`🚀 Manually triggering rule: ${rule.name}`);
        await ruleExecutor.executeRule(rule);
        
        console.log('✅ Manual trigger complete. Check logs.');
    } catch (err) {
        console.error('Error Details:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
        }
    } finally {
        await mongoose.disconnect();
    }
}

testRule();
