const mongoose = require("mongoose");

const uri = process.env.MONGO_URI

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log(`Connect MongoDB successfully !`);
  } catch (error) {
    console.log(`Connect DB error: ${error}`);
    process.exit(1);
  }
};

const db = {
  connect: connectDB,
};

module.exports = db;
