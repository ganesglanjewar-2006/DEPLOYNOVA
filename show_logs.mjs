import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0";
const DEPLOYMENT_ID = "69cb5abc3fbb8f8c8204066f";

async function showLogs() {
  try {
    await mongoose.connect(MONGODB_URI);
    const Deployment = mongoose.model('Deployment', new mongoose.Schema({ logs: Array, projectId: mongoose.Schema.Types.ObjectId }, { strict: false }));
    const d = await Deployment.findOne({}).sort({ createdAt: -1 });
    if (!d) {
      console.log('No deployment found');
      process.exit(1);
    }
    console.log(`Deployment ID: ${d._id} (Project ID: ${d.projectId}) [STATUS: ${d.status}]`);
    d.logs.forEach(l => {
      console.log(`[${l.stage}] ${l.level}: ${l.message}`);
    });
    if (d.url) console.log(`URL: ${d.url}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
showLogs();
