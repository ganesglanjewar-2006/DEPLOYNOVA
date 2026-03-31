import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://ganesh98500:%40marotiganesh2006%40@cluster0.qiw3awa.mongodb.net/deploynova?retryWrites=true&w=majority&appName=Cluster0";

async function patchProject() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define temporary schema
    const projectSchema = new mongoose.Schema({}, { strict: false });
    const Project = mongoose.model('Project', projectSchema);

    // Find and update ALL related projects
    const result = await Project.updateMany(
      { $or: [{ name: /NEXUS/i }, { name: /CapitalVue/i }] },
      { 
        rootDirectory: "fin-nexus/backend",
        customStartCmd: "npm start"
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Updated ${result.modifiedCount} monorepo projects for resilience.`);
    } else {
      console.log('⚠️ No matching projects found. Listing all:');
      const all = await Project.find({});
      all.forEach(p => console.log(`- ${p.name} [${p._id}]`));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

patchProject();
