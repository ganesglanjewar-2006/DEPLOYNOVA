import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables manually if needed, or assume they are in the environment
const MONGODB_URI = "mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0";

async function checkStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define temporary schemas to avoid importing complex models
    const projectSchema = new mongoose.Schema({}, { strict: false });
    const Project = mongoose.model('Project', projectSchema);
    
    const deploymentSchema = new mongoose.Schema({}, { strict: false });
    const Deployment = mongoose.model('Deployment', deploymentSchema);

    const projects = await Project.find({});
    const deployments = await Deployment.find({ status: 'live' }).sort({ createdAt: -1 });

    console.log('\n--- ACTIVE PROJECTS ---');
    projects.forEach(p => {
      console.log(`- ${p.name} [${p._id}]: ${p.status}`);
    });

    console.log('\n--- LIVE DEPLOYMENTS ---');
    deployments.forEach(d => {
      console.log(`- ProjectID: ${d.projectId} | Port: ${d.port} | URL: ${d.url || 'N/A'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkStatus();
