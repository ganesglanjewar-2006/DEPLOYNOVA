const axios = require('axios');

const DEPLOYNOVA_URL = 'http://localhost:5000/api';
const LIFEOS_URL = 'http://localhost:5001/api';
const API_KEY = 'deploynova_internal_secret_key_889';

async function runTest() {
    console.log('\n🚀 Starting Stage 3 Stress Test...\n');

    try {
        // 1. Get Project ID
        console.log('1. Fetching Project ID from DeployNova...');
        const { data: pData } = await axios.get(`${DEPLOYNOVA_URL}/projects`, { headers: { 'x-api-key': API_KEY } });
        if (!pData.projects.length) throw new Error('No projects found');
        const projectId = pData.projects[0]._id;
        console.log(`✅ Found Project: ${projectId}\n`);

        // 2. Create Rule
        console.log('2. Creating Rule A (Active, 1-minute)...');
        const { data: r1 } = await axios.post(`${LIFEOS_URL}/rules`, {
            name: 'Stress Test Rule A',
            trigger: { type: 'cron', value: '*/1 * * * *' },
            action: { type: 'deploy', targetId: projectId },
            status: 'active'
        });
        const ruleId = r1.rule._id;
        console.log(`✅ Rule A Created: ${ruleId}\n`);

        // 3. Update Rule (Toggle Inactive)
        console.log('3. Toggling Rule A to Inactive...');
        await axios.put(`${LIFEOS_URL}/rules/${ruleId}`, { status: 'inactive' });
        console.log('✅ Rule A set to inactive\n');

        // 4. Create Rule B (Immediate failure test)
        console.log('4. Creating Rule B (Invalid Project ID)...');
        const { data: r2 } = await axios.post(`${LIFEOS_URL}/rules`, {
            name: 'Error Handler Test',
            trigger: { type: 'cron', value: '*/1 * * * *' },
            action: { type: 'deploy', targetId: '000000000000000000000000' },
            status: 'active'
        });
        console.log(`✅ Rule B (Error Test) Created: ${r2.rule._id}\n`);

        // 5. Check Rules List
        console.log('5. Verifying Rule List...');
        const { data: list } = await axios.get(`${LIFEOS_URL}/rules`);
        console.log(`✅ Found ${list.rules.length} rules in LifeOS DB\n`);

        // 6. Delete Test Rules
        console.log('6. Cleaning up rules...');
        await axios.delete(`${LIFEOS_URL}/rules/${ruleId}`);
        await axios.delete(`${LIFEOS_URL}/rules/${r2.rule._id}`);
        console.log('✅ Cleanup complete\n');

        console.log('\n⭐ STAGE 3 STRESS TEST COMPLETED SUCCESSFULLY ⭐\n');

    } catch (err) {
        console.error('\n❌ Stress Test Failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

runTest();
