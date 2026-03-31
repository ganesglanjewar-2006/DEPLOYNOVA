import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0";

async function checkProjects() {
  try {
    await mongoose.connect(MONGODB_URI);
    const Project = mongoose.model('Project', new mongoose.Schema({ name: String, repoUrl: String, rootDirectory: String }, { strict: false }));
    const all = await Project.find({ name: { $in: [/Nexus/i, /CapitalVue/i] } });
    all.forEach(p => {
      console.log(`- ${p.name} [ID: ${p._id}] -> ${p.repoUrl} (ROOT: ${p.rootDirectory})`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkProjects();
