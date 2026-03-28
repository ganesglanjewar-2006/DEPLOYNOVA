const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`\n\n  🧠 LifeOS Intelligence Connected`);
        console.log(`  🔗 MongoDB: ${conn.connection.host}`);
        console.log(`  ═══════════════════════\n`);
    } catch (err) {
        console.error(`❌ MongoDB Connection Error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
