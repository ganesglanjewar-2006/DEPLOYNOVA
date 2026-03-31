import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const RuleSchema = new mongoose.Schema({
    name: String,
    action: {
        targetId: String
    }
});

const Rule = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);

async function checkRules() {
    try {
        const mongoUri = 'mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoUri);
        const rules = await Rule.find();
        console.log('Automated Rules:');
        rules.forEach(r => {
            console.log(`- ${r.name} [Target Project ID: ${r.action.targetId}]`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkRules();
