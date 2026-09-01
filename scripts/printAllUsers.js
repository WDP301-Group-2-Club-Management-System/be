const mongoose = require('mongoose');
require('dotenv').config();

const printUsers = async () => {
  const uri = process.env.MONGO_URI
  try {
    await mongoose.connect(uri);
    const Users = mongoose.model('Users', new mongoose.Schema({}, { strict: false }));
    const users = await Users.find({});
    console.log('--- ALL USERS ---');
    users.forEach(u => {
      console.log(`ID: ${u._id} | Email: ${u.email} | Name: ${u.fullName} | Permission: ${u.permission} | Status: ${u.status}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

printUsers();
