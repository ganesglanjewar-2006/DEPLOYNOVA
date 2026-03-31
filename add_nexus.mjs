import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0";
const USER_ID = "69c82a8bc6690a6c9b5ededa";

async function addNexus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const projectSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      repoUrl: String,
      framework: String,
      branch: String,
      rootDirectory: String,
      customStartCmd: String,
      status: String
    }, { collection: 'projects' });

    const Project = mongoose.model('Project', projectSchema);

    // Check if it already exists
    const existing = await Project.findOne({ name: /NEXUS/i });
    if (existing) {
      console.log('NEXUS project already exists:', existing._id);
      await Project.findByIdAndUpdate(existing._id, {
        rootDirectory: "fin-nexus",
        customStartCmd: "npm start"
      });
      console.log('Updated existing NEXUS project.');
    } else {
      const nexus = new Project({
        userId: new mongoose.Types.ObjectId(USER_ID),
        name: "NEXUS",
        repoUrl: "https://github.com/ganesglanjewar-2006/Nexus", // Inferred from context
        framework: "node",
        branch: "main",
        rootDirectory: "fin-nexus",
        customStartCmd: "npm start",
        status: "active"
      });
      await nexus.save();
      console.log('✅ Created NEXUS project:', nexus._id);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addNexus();
