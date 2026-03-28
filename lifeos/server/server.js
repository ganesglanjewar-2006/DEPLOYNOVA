const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const cronEngine = require('./services/CronEngine');

// ── Load Config ──
dotenv.config();

// ── App Setup ──
const app = express();
app.use(cors());
app.use(express.json());

// ── Connect DB ──
connectDB();

// ── Initialize Automation Engine ──
// We wait for DB to connect before starting cron (handled via RuleController/CronEngine logic)
cronEngine.init();

// ── Routes ──
app.get('/', (req, res) => {
    res.json({
        name: 'LifeOS Brain',
        tagline: '🧠 Automation & Ecosystem Intelligence',
        status: 'active',
        engine: 'node-cron',
        integrations: ['DeployNova']
    });
});

app.use('/api/rules', require('./routes/ruleRoutes'));

// ── Error Handling ──
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

app.use((err, req, res, next) => {
    console.error(`[LifeOS Error] ❌ ${err.stack}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start Server ──
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  🧠 LifeOS Intelligence is LIVE!');
    console.log(`  🌐 Server:  http://localhost:${PORT}`);
    console.log(`  📡 API:     http://localhost:${PORT}/api/rules`);
    console.log('═══════════════════════════════════════════════════');
});
