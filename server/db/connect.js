const mongoose = require('mongoose');
const password = encodeURIComponent("ngdtCsr0EsHCl31s");

const uri = `mongodb+srv://SoleLinkDB:${password}@solelinkcluster.bixyibj.mongodb.net/?appName=SoleLinkCluster`

mongoose.connect(uri)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

