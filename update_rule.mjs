import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const RuleSchema = new mongoose.Schema({
    name: String,
    action: {
        targetId: String
    }
});

const Rule = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);

async function updateRule() {
    try {
        const mongoUri = 'mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri);
        
        const ruleName = 'Prtoduction Deployment';
        const newTargetId = '69cb5a08864c3eb385311d4a'; // NEXUS project ID
        
        const result = await Rule.updateOne(
            { name: ruleName },
            { $set: { 'action.targetId': newTargetId } }
        );
        
        if (result.matchedCount > 0) {
            console.log(`✅ Successfully updated rule "${ruleName}" to target project ${newTargetId}`);
        } else {
            console.log(`❌ Could not find rule "${ruleName}"`);
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

updateRule();
