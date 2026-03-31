import axios from 'axios';

const BASE = "http://localhost:5000";
const PROJECT_ID = "69cb4fbc9ab447754d03f7f2";

async function testDeploy() {
  try {
    console.log('--- Registering Test User ---');
    const registerResponse = await axios.post(`${BASE}/api/auth/register`, {
      name: "Nexus Deploy Tester",
      email: `tester-${Date.now()}@test.com`,
      password: "securepass123"
    });
    
    const token = registerResponse.data.token;
    const userId = registerResponse.data.user.id;
    console.log(`✅ Registered and got token. User ID: ${userId}`);

    // Update project owner in DB so we can access it via API
    console.log('--- Updating Project Owner in DB ---');
    const MONGODB_URI = "mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0";
    const { execSync } = await import('child_process');
    execSync(`node -e "const mongoose = require('mongoose'); async function run() { await mongoose.connect('${MONGODB_URI}'); const Project = mongoose.model('Project', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId }, { strict: false })); await Project.findByIdAndUpdate('${PROJECT_ID}', { userId: new mongoose.Types.ObjectId('${userId}') }); process.exit(0); } run();"`);
    console.log('✅ Project owner updated');

    console.log(`--- Triggering Deployment for Project: ${PROJECT_ID} ---`);
    const deployResponse = await axios.post(`${BASE}/api/deploy/${PROJECT_ID}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Deployment Status:', deployResponse.status);
    console.log('Response Detail:', JSON.stringify(deployResponse.data, null, 2));

    const deploymentId = deployResponse.data.deployment.id;
    console.log(`Deployment ID: ${deploymentId}`);

    // Wait and watch logs
    console.log('\n--- Watching Logs for 20 seconds ---');
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const logsResponse = await axios.get(`${BASE}/api/deploy/logs/${deploymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`\n--- Log Update (${(i+1)*5}s) ---`);
      logsResponse.data.logs.slice(-5).forEach(log => {
        console.log(`[${log.stage}] ${log.level}: ${log.message}`);
      });
      if (logsResponse.data.status === 'live' || logsResponse.data.status === 'failed') {
        console.log(`\nFinal Status: ${logsResponse.data.status}`);
        break;
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

testDeploy();
